import http from 'node:http';
import fs from 'node:fs';
import config from './config/index.js';
import { processTickFile } from './controllers/tick.controller.js';
import { closeLogger } from './logger/index.js';

let httpServer = null;
let shuttingDown = false;

/**
 * Minimal dependency-free health-check server. Kept separate from tick
 * processing so container orchestrators (Docker/EC2) have a liveness probe
 * regardless of CSV processing state.
 *
 * @returns {http.Server}
 */
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', app: config.appName, env: config.nodeEnv }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(config.port, () => {
    console.log(`[${config.appName}] Health server listening on port ${config.port}`);
  });

  return server;
}

/**
 * Application bootstrap: validates the environment, starts the health
 * server, and streams the configured input CSV end-to-end.
 */
async function main() {
  fs.mkdirSync(config.logPath, { recursive: true });

  httpServer = startHealthServer();

  console.log(`[${config.appName}] Starting tick stream from: ${config.inputFile}`);

  try {
    const { rowCount } = await processTickFile();
    console.log(`[${config.appName}] Finished processing ${rowCount} ticks.`);
  } catch (err) {
    console.error(`[${config.appName}] Fatal error while processing input file: ${err.message}`);
    await shutdown(1);
  }
}

/**
 * Gracefully shuts down the HTTP server and flushes log streams before
 * exiting the process.
 *
 * @param {number} [exitCode=0]
 */
async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[${config.appName}] Shutting down...`);

  await closeLogger();

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
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
