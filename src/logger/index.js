import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';

/** @type {fs.WriteStream | null} */
let activeStream = null;
/** @type {string | null} */
let activeDateKey = null;

/**
 * Ensures the configured log directory exists, creating it (recursively)
 * if missing. Safe to call repeatedly.
 *
 * @param {string} logPath - Absolute path to the log directory.
 */
function ensureLogDirectory(logPath) {
  fs.mkdirSync(logPath, { recursive: true });
}

/**
 * Derives the YYYY-MM-DD key used for daily log file rotation.
 *
 * @param {Date} date
 * @returns {string}
 */
function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns the currently active append-only write stream for today's log
 * file, rotating (closing the previous stream and opening a new one) when
 * the date changes. Reusing a single open stream avoids the overhead of
 * opening/closing a file descriptor on every tick.
 *
 * @returns {fs.WriteStream}
 */
function getActiveStream() {
  const dateKey = getDateKey(new Date());

  if (activeStream && activeDateKey === dateKey) {
    return activeStream;
  }

  if (activeStream) {
    activeStream.end();
  }

  ensureLogDirectory(config.logPath);
  const filePath = path.join(config.logPath, `app-${dateKey}.json`);
  activeStream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
  activeStream.on('error', (err) => {
    console.error(`[logger] Failed to write log file ${filePath}: ${err.message}`);
  });
  activeDateKey = dateKey;

  return activeStream;
}

/**
 * Appends a single JSON log entry (newline-delimited) to today's log file.
 * Append-only, non-blocking: relies on the stream's internal buffer for
 * backpressure so tick processing is never held up by disk I/O.
 *
 * @param {object} entry - Structured log entry to persist.
 */
export function writeLogEntry(entry) {
  try {
    const stream = getActiveStream();
    stream.write(`${JSON.stringify(entry)}\n`);
  } catch (err) {
    console.error(`[logger] Unexpected logging failure: ${err.message}`);
  }
}

/**
 * Flushes and closes the active log stream. Must be called during graceful
 * shutdown so buffered writes are not lost.
 *
 * @returns {Promise<void>}
 */
export function closeLogger() {
  return new Promise((resolve) => {
    if (!activeStream) {
      resolve();
      return;
    }
    activeStream.end(() => {
      activeStream = null;
      activeDateKey = null;
      resolve();
    });
  });
}
