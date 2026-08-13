import { spawn } from 'node:child_process';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import ScriptDao from '../dao/ScriptDao.js';
import ScriptExecutionLogDao from '../dao/ScriptExecutionLogDao.js';
import processRegistry from './processRegistry.js';
import responseHandler from '../helper/responseHandler.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

/**
 * Business logic for Python trading-strategy script configuration and
 * process lifecycle management (start/stop/restart, execution history).
 *
 * DAOs are injectable so tests can supply SQLite-backed instances instead
 * of touching the production Postgres connection.
 */
class ScriptService {
  /**
   * @param {ScriptDao} [scriptDao]
   * @param {ScriptExecutionLogDao} [scriptExecutionLogDao]
   */
  constructor(scriptDao = new ScriptDao(), scriptExecutionLogDao = new ScriptExecutionLogDao()) {
    this.scriptDao = scriptDao;
    this.scriptExecutionLogDao = scriptExecutionLogDao;
  }

  /**
   * @param {{ script_name: string, strategy_type: string, description: string, react_script: string }} payload
   */
  async createScript(payload) {
    const scriptId = uuidv4();
    const pythonFilePath = path.join(config.python.scriptsDir, `${scriptId}.py`);

    const script = await this.scriptDao.create({
      script_id: scriptId,
      script_name: payload.script_name,
      strategy_type: payload.strategy_type,
      description: payload.description,
      react_script: payload.react_script,
      python_file_path: pythonFilePath,
      status: 'stopped',
    });

    return responseHandler.success('Script created successfully', this.#toScriptDto(script), 201);
  }

  /**
   * @param {{ page?: number, limit?: number }} pagination
   */
  async getScripts({ page = 1, limit = 10 } = {}) {
    const { rows, count } = await this.scriptDao.findAllPaginated({ page, limit });

    const data = {
      scripts: rows.map((row) => this.#toScriptDto(row)),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.max(1, Math.ceil(count / Number(limit))),
      },
    };

    return responseHandler.success('Scripts fetched successfully', data);
  }

  /**
   * Stops any tracked process for the script, then spawns a fresh one.
   *
   * @param {string} scriptId
   */
  async restartScript(scriptId) {
    const script = await this.scriptDao.findById(scriptId);
    if (!script) {
      return responseHandler.error('Script not found', 404);
    }

    this.#stopTrackedProcess(scriptId);
    await this.#spawnPythonProcess(script, 'Manual restart');
    await this.scriptDao.updateStatus(scriptId, 'running');

    return responseHandler.success('Script restarted successfully');
  }

  /**
   * Kills the tracked process (if any) and marks the script stopped.
   *
   * @param {string} scriptId
   */
  async stopScript(scriptId) {
    const script = await this.scriptDao.findById(scriptId);
    if (!script) {
      return responseHandler.error('Script not found', 404);
    }

    const wasRunning = this.#stopTrackedProcess(scriptId);
    await this.scriptDao.updateStatus(scriptId, 'stopped');

    if (!wasRunning) {
      logger.warn(`No live process tracked for script ${scriptId}; marked stopped in database only`);
    }

    return responseHandler.success('Script stopped successfully');
  }

  /**
   * @param {string} scriptId
   * @param {{ date_from?: string, date_to?: string }} filters
   */
  async getLogs(scriptId, filters = {}) {
    const script = await this.scriptDao.findById(scriptId);
    if (!script) {
      return responseHandler.error('Script not found', 404);
    }

    const logs = await this.scriptExecutionLogDao.findLogsByScript(scriptId, {
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return responseHandler.success(
      'Execution logs fetched successfully',
      logs.map((log) => this.#toLogDto(log)),
    );
  }

  /**
   * Supervisory pass invoked by the cron scheduler: every script marked
   * `running` in the database should have a live process. Restarts any
   * that have died (crash, host restart, etc). A failure for one script
   * must never prevent the others from being checked, so every script is
   * handled in its own try/catch.
   */
  async ensureActiveScriptsRunning() {
    const activeScripts = await this.scriptDao.findActiveScripts();

    for (const script of activeScripts) {
      const tracked = processRegistry.get(script.script_id);
      if (tracked && this.#isProcessAlive(tracked.pid)) {
        continue;
      }

      try {
        await this.#spawnPythonProcess(script, 'Supervisory restart: process was not running');
      } catch (err) {
        logger.error(`Cron supervision failed for script ${script.script_id}: ${err.message}`);
        await this.scriptDao.updateStatus(script.script_id, 'failed');
      }
    }
  }

  /**
   * @param {number} [pid]
   * @returns {boolean}
   */
  #isProcessAlive(pid) {
    if (!pid) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @param {string} scriptId
   * @returns {boolean} Whether a tracked process was found and signaled.
   */
  #stopTrackedProcess(scriptId) {
    const tracked = processRegistry.get(scriptId);
    if (!tracked) return false;

    try {
      tracked.child.kill('SIGTERM');
    } catch (err) {
      logger.error(`Failed to signal process for script ${scriptId}: ${err.message}`);
    }

    processRegistry.remove(scriptId);
    return true;
  }

  /**
   * Creates an execution log row, spawns the script's python process, and
   * wires listeners that keep the log and script status in sync as the
   * process produces output and eventually exits.
   *
   * @param {object} script - Script model instance (or plain object with
   *   `script_id` / `python_file_path`).
   * @param {string} [logMessage]
   * @returns {Promise<import('node:child_process').ChildProcess>}
   */
  async #spawnPythonProcess(script, logMessage = null) {
    const executionLog = await this.scriptExecutionLogDao.createLog({
      script_id: script.script_id,
      status: 'running',
      start_time: new Date(),
      log_message: logMessage,
    });

    const child = spawn(config.python.executable, [script.python_file_path]);
    processRegistry.set(script.script_id, { pid: child.pid, child });

    let output = '';
    const MAX_OUTPUT_LENGTH = 10000;
    const appendOutput = (chunk) => {
      output = `${output}${chunk}`.slice(-MAX_OUTPUT_LENGTH);
    };

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.on('error', (err) => {
      processRegistry.remove(script.script_id);

      this.scriptExecutionLogDao
        .updateLog(executionLog.execution_id, {
          status: 'failed',
          end_time: new Date(),
          log_message: `${output}\n${err.message}`.trim(),
        })
        .catch((updateErr) => logger.error(`Failed updating execution log: ${updateErr.message}`));

      this.scriptDao
        .updateStatus(script.script_id, 'failed')
        .catch((updateErr) => logger.error(`Failed updating script status: ${updateErr.message}`));
    });

    child.on('exit', (code, signal) => {
      processRegistry.remove(script.script_id);

      let status = 'failed';
      if (signal !== null) {
        status = 'stopped';
      } else if (code === 0) {
        status = 'success';
      }

      this.scriptExecutionLogDao
        .updateLog(executionLog.execution_id, {
          status,
          end_time: new Date(),
          log_message: output || `Process exited with code ${code}, signal ${signal}`,
        })
        .catch((updateErr) => logger.error(`Failed updating execution log: ${updateErr.message}`));

      if (status !== 'success') {
        this.scriptDao
          .updateStatus(script.script_id, status === 'failed' ? 'failed' : 'stopped')
          .catch((updateErr) => logger.error(`Failed updating script status: ${updateErr.message}`));
      }
    });

    await this.scriptExecutionLogDao.updateLog(executionLog.execution_id, {
      process_id: String(child.pid),
    });

    return child;
  }

  #toScriptDto(script) {
    const plain = typeof script.get === 'function' ? script.get({ plain: true }) : script;
    return {
      script_id: plain.script_id,
      script_name: plain.script_name,
      strategy_type: plain.strategy_type,
      description: plain.description,
      status: plain.status,
      created_at: plain.created_at,
    };
  }

  #toLogDto(log) {
    const plain = typeof log.get === 'function' ? log.get({ plain: true }) : log;
    return {
      execution_id: plain.execution_id,
      script_id: plain.script_id,
      start_time: plain.start_time,
      end_time: plain.end_time,
      status: plain.status,
      log_message: plain.log_message,
    };
  }
}

export default ScriptService;
