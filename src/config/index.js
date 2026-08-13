import 'dotenv/config';
import path from 'node:path';

/**
 * Centralized, immutable application configuration.
 * All configurable values must be sourced from environment variables here —
 * no magic numbers or hardcoded paths elsewhere in the codebase.
 */
const config = Object.freeze({
  port: Number.parseInt(process.env.PORT, 10) || 3000,
  inputFile: path.resolve(process.cwd(), process.env.INPUT_FILE || 'data/sample.csv'),
  logPath: path.resolve(process.cwd(), process.env.LOG_PATH || 'logs'),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: 'io2script',
  csv: {
    // Header names expected in the source CSV (order-independent).
    timestampField: 'Date Time',
    transactionIdField: 'Transaction ID',
    delimiter: ',',
  },
  stream: {
    // Read buffer size for the file stream, tuned for high-throughput line reads.
    highWaterMark: 64 * 1024,
  },
  db: {
    url: process.env.DATABASE_URL || 'postgres://io2script:io2script@localhost:5432/io2script',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  python: {
    executable: process.env.PYTHON_EXECUTABLE || 'python3',
    scriptsDir: path.resolve(process.cwd(), process.env.PYTHON_SCRIPTS_DIR || 'python_scripts'),
  },
  cron: {
    scriptSchedule: process.env.SCRIPT_CRON_SCHEDULE || '* * * * *',
  },
});

export default config;
