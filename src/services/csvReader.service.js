import fs from 'node:fs';
import readline from 'node:readline';
import { parseCsvLine, mapRowToObject } from '../utils/csvLineParser.js';
import config from '../config/index.js';

/**
 * Streams a CSV file line-by-line and invokes `onRow` for every data row as
 * soon as it is parsed — never buffers the file into memory. Built on
 * Node's core `readline` + `fs.createReadStream`, so no extra CSV parsing
 * dependency is required even for multi-gigabyte inputs.
 *
 * @param {string} filePath - Absolute path to the CSV file.
 * @param {(row: Record<string, string>, lineNumber: number) => void} onRow -
 *   Called synchronously for each successfully parsed data row.
 * @param {(message: string, lineNumber: number) => void} [onWarning] -
 *   Called for recoverable issues (empty lines, malformed rows) that do not
 *   stop the stream.
 * @returns {Promise<{ rowCount: number }>} Resolves once the whole file has
 *   been consumed.
 */
export function readCsvStream(filePath, onRow, onWarning = () => {}) {
  return new Promise((resolve, reject) => {
    let headers = null;
    let lineNumber = 0;
    let rowCount = 0;
    let settled = false;

    const fileStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: config.stream.highWaterMark,
    });

    fileStream.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (err.code === 'ENOENT') {
        reject(new Error(`Input CSV file not found: ${filePath}`));
      } else if (err.code === 'EACCES') {
        reject(new Error(`Permission denied reading input CSV file: ${filePath}`));
      } else {
        reject(new Error(`Failed to read input CSV file: ${err.message}`));
      }
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    rl.on('line', (rawLine) => {
      lineNumber += 1;

      if (rawLine.trim().length === 0) {
        onWarning('Skipped empty line', lineNumber);
        return;
      }

      if (headers === null) {
        headers = parseCsvLine(rawLine, config.csv.delimiter);
        return;
      }

      const values = parseCsvLine(rawLine, config.csv.delimiter);

      if (values.length !== headers.length) {
        onWarning(
          `Malformed row: expected ${headers.length} fields, got ${values.length}`,
          lineNumber,
        );
      }

      const row = mapRowToObject(headers, values);

      try {
        onRow(row, lineNumber);
        rowCount += 1;
      } catch (err) {
        onWarning(`Row processing failed: ${err.message}`, lineNumber);
      }
    });

    rl.on('close', () => {
      if (settled) return;
      settled = true;
      resolve({ rowCount });
    });

    rl.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed while reading CSV lines: ${err.message}`));
    });
  });
}
