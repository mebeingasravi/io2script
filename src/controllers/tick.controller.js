import config from '../config/index.js';
import { readCsvStream } from '../services/csvReader.service.js';
import { buildTickResult, toLogEntry } from '../services/tickProcessor.service.js';
import { printTick, printRowError } from '../utils/consolePrinter.js';
import { writeLogEntry } from '../logger/index.js';

/**
 * Orchestrates streaming a tick CSV file: for every row, validates its
 * timestamp, prints the result to the console, and persists it to the
 * JSON log — all as soon as the row is read, with no batching.
 *
 * A single malformed/invalid row is logged as a warning and skipped; it
 * never aborts the stream.
 *
 * @param {string} [filePath] - Defaults to the configured INPUT_FILE.
 * @returns {Promise<{ rowCount: number }>}
 */
export async function processTickFile(filePath = config.inputFile) {
  const handleRow = (row, lineNumber) => {
    try {
      const tickResult = buildTickResult(row);
      printTick(tickResult);
      writeLogEntry(toLogEntry(tickResult));
    } catch (err) {
      printRowError(`Line ${lineNumber}`, err);
    }
  };

  const handleWarning = (message, lineNumber) => {
    printRowError(`Line ${lineNumber}: ${message}`);
  };

  return readCsvStream(filePath, handleRow, handleWarning);
}
