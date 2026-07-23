import config from '../config/index.js';
import { parseTickTimestamp, compareTickTiming } from '../utils/timestamp.js';

/**
 * Validates and enriches a single parsed CSV row into a tick result,
 * comparing its embedded timestamp against the current processing time.
 *
 * @param {Record<string, string>} row - Parsed CSV row.
 * @param {number} [currentTimeMs] - Injectable "now" for deterministic tests.
 * @returns {{
 *   tickTimeMs: number,
 *   currentTimeMs: number,
 *   differenceMs: number,
 *   isOnTime: boolean,
 *   data: Record<string, string>,
 * }}
 * @throws {Error} If the row's timestamp field is missing or unparsable.
 */
export function buildTickResult(row, currentTimeMs = Date.now()) {
  const rawTimestamp = row[config.csv.timestampField];
  const tickTimeMs = parseTickTimestamp(rawTimestamp);

  if (Number.isNaN(tickTimeMs)) {
    throw new Error(`Invalid timestamp value: "${rawTimestamp}"`);
  }

  const { differenceMs, isOnTime } = compareTickTiming(tickTimeMs, currentTimeMs);

  return {
    tickTimeMs,
    currentTimeMs,
    differenceMs,
    isOnTime,
    data: row,
  };
}

/**
 * Converts a tick result into the structured JSON shape persisted to the
 * daily log file.
 *
 * @param {ReturnType<typeof buildTickResult>} tickResult
 * @returns {{ timestamp: string, currentTime: string, difference: number, status: string, data: object }}
 */
export function toLogEntry(tickResult) {
  const { tickTimeMs, currentTimeMs, differenceMs, isOnTime, data } = tickResult;

  return {
    timestamp: new Date(tickTimeMs).toISOString(),
    currentTime: new Date(currentTimeMs).toISOString(),
    difference: differenceMs,
    status: isOnTime ? 'success' : 'failed',
    data,
  };
}
