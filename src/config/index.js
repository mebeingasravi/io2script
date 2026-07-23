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
});

export default config;
