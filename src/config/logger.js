/**
 * General-purpose application logger (API/service layer).
 * Distinct from `src/logger/index.js`, which is the append-only JSON tick
 * logger for the CSV ingestion pipeline — this one is for request/process
 * lifecycle logging (info/warn/error) across the Script Management API.
 */
function timestamp() {
  return new Date().toISOString();
}

function format(level, args) {
  return [`[${timestamp()}] [${level}]`, ...args];
}

const logger = {
  info: (...args) => console.log(...format('INFO', args)),
  warn: (...args) => console.warn(...format('WARN', args)),
  error: (...args) => console.error(...format('ERROR', args)),
};

export default logger;
