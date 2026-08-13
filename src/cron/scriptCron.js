import cron from 'node-cron';
import ScriptService from '../services/ScriptService.js';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptService = new ScriptService();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Formats a Date as an IST (UTC+5:30) ISO-like timestamp, e.g.
 * "2026-08-13T03-30-00-756". Used so log entries read in local (India)
 * time instead of UTC.
 *
 * @param {Date} date
 * @returns {string}
 */
function toISTTimestamp(date) {
	return new Date(date.getTime() + IST_OFFSET_MS).toISOString().replace('Z', '');
}

const CRON_LOG_FILE = path.resolve(process.cwd(), 'logs', 'python_cron_log.log');

/**
 * Appends a single structured JSON log entry (one line) to the shared
 * python cron log file, creating the logs directory if needed.
 *
 * @param {{status: 'success'|'error', message: string, data?: object, meta?: object}} entry
 */
function appendCronLog({ status, message, data = {}, meta = {} }) {
	const logsDir = path.dirname(CRON_LOG_FILE);
	if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

	const record = {
		timestamp: toISTTimestamp(new Date()),
		format: 'IST',
		status,
		message,
		data,
		meta,
	};

	fs.appendFileSync(CRON_LOG_FILE, `${JSON.stringify(record)}\n`);
}

/**
 * Starts the recurring job that supervises active Python scripts: it asks
 * the service layer to ensure every script marked `running` in the
 * database actually has a live process, restarting any that have died.
 *
 * No database or process logic lives here — scheduling only. All work is
 * delegated to `ScriptService.ensureActiveScriptsRunning()`.
 *
 * @returns {import('node-cron').ScheduledTask}
 */
export function startScriptCron() {
	const schedule = (config && config.cron && config.cron.scriptSchedule) || '* * * * * *';
	const scriptPath = path.resolve(process.cwd(), 'python_scripts', 'copy_file.py');

	const task = cron.schedule(schedule, async () => {
		const startedAt = Date.now();
		try {
			logger.info(`\x1b[33mStarting python script: ${scriptPath}\x1b[0m`);

			const proc = spawn('python3', [scriptPath], { cwd: process.cwd() });

			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			proc.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('close', (code) => {
				const status = code === 0 ? 'success' : 'error';
				appendCronLog({
					status,
					message:
						status === 'success'
							? 'Python script completed successfully'
							: `Python script exited with code ${code}`,
					data: { stdout: stdout.trim(), stderr: stderr.trim() },
					meta: { scriptPath, exitCode: code, pid: proc.pid, durationMs: Date.now() - startedAt },
				});
				logger.info(`Python script run completed (exit ${code})`);
			});

			proc.on('error', (err) => {
				appendCronLog({
					status: 'error',
					message: `Failed to start python script: ${err.message}`,
					data: {},
					meta: { scriptPath, durationMs: Date.now() - startedAt },
				});
				logger.error(`Failed to start python script: ${err.message}`);
			});

		} catch (err) {
			appendCronLog({
				status: 'error',
				message: `Script cron run failed: ${err.message}`,
				data: {},
				meta: { scriptPath, durationMs: Date.now() - startedAt },
			});
			logger.error(`Script cron run failed: ${err.message}`);
		}
	});

	logger.info(`Python-run cron scheduled: "${schedule}"`);

	return task;
}

export default startScriptCron;



// const task = cron.schedule(config.cron.scriptSchedule, async () => {
//     try {
//       await scriptService.ensureActiveScriptsRunning();
//     } catch (err) {
//       logger.error(`Script cron run failed: ${err.message}`);
//     }
//   });

//   logger.info(`Script supervision cron scheduled: "${config.cron.scriptSchedule}"`);

//   return task;
