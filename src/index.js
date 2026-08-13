import fs from 'node:fs';
import config from './config/index.js';
import { processTickFile } from './controllers/tick.controller.js';
import { closeLogger } from './logger/index.js';
import app from './app.js';
import models from './models/index.js';
import { startScriptCron } from './cron/scriptCron.js';
import logger from './config/logger.js';

let httpServer = null;
let cronTask = null;
let shuttingDown = false;

/**
 * Verifies the database is reachable without blocking startup: the Script
 * Management API needs it, but the CSV tick pipeline does not, so a
 * database outage must not prevent tick processing from running.
 */
async function verifyDatabaseConnection() {
  try {
    await models.sequelize.authenticate();
    logger.info('\x1b[31m[Database connection established.\x1b[0m');

    // Creates missing tables only; never alters or drops existing ones.
    await models.sequelize.sync();
    logger.info('\x1b[32m[Database schema is up to date.\x1b[0m');
  } catch (err) {
    logger.error(`\x1b[31mDatabase connection failed (Script Management API will error until it recovers): ${err.message}\x1b[0m`);
  }
}

/**
 * Application bootstrap: validates the environment, starts the Express API
 * (Script Management endpoints + health check), starts the script
 * supervision cron, and streams the configured input CSV end-to-end.
 */
async function main() {
  fs.mkdirSync(config.logPath, { recursive: true });

  await verifyDatabaseConnection();

  httpServer = app.listen(config.port, () => {
    logger.info(`\x1b[32m[${config.appName}] API server listening on port ${config.port}\x1b[0m`);
  });

  cronTask = startScriptCron();

  console.log(`[${config.appName}] Starting tick stream from: ${config.inputFile}`);

  // try {
  //   const { rowCount } = await processTickFile();
  //   console.log(`[${config.appName}] Finished processing ${rowCount} ticks.`);
  // } catch (err) {
  //   console.error(`[${config.appName}] Fatal error while processing input file: ${err.message}`);
  //   await shutdown(1);
  // }
}

/**
 * Gracefully shuts down the HTTP server, cron scheduler, database
 * connection, and flushes log streams before exiting the process.
 *
 * @param {number} [exitCode=0]
 */
async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[${config.appName}] Shutting down...`);

  if (cronTask) {
    cronTask.stop();
  }

  await closeLogger();

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  try {
    await models.sequelize.close();
  } catch (err) {
    logger.error(`Error closing database connection: ${err.message}`);
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (err) => {
  console.error(`[${config.appName}] Uncaught exception: ${err.message}`);
  shutdown(1);
});
process.on('unhandledRejection', (reason) => {
  console.error(`[${config.appName}] Unhandled rejection: ${reason}`);
  shutdown(1);
});

main();
