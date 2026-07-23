/**
 * Parses a tick timestamp string into epoch milliseconds.
 * Accepts both native JS Date-string format (e.g. "Mon Jul 20 2026 12:56:07
 * GMT+0530 (India Standard Time)") and raw numeric epoch milliseconds.
 *
 * @param {string} rawTimestamp - Timestamp value as found in the CSV row.
 * @returns {number} Epoch milliseconds, or NaN if the value is invalid.
 */
export function parseTickTimestamp(rawTimestamp) {
  if (rawTimestamp === undefined || rawTimestamp === null || rawTimestamp === '') {
    return Number.NaN;
  }

  if (/^\d+$/.test(rawTimestamp.trim())) {
    return Number.parseInt(rawTimestamp.trim(), 10);
  }

  const parsed = Date.parse(rawTimestamp);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

/**
 * Compares a tick timestamp against the current processing time.
 *
 * @param {number} tickTimeMs - Tick timestamp in epoch milliseconds.
 * @param {number} currentTimeMs - Current processing timestamp in epoch milliseconds.
 * @returns {{ differenceMs: number, isOnTime: boolean }} Difference and validation status.
 */
export function compareTickTiming(tickTimeMs, currentTimeMs) {
  const differenceMs = currentTimeMs - tickTimeMs;
  return {
    differenceMs,
    isOnTime: currentTimeMs >= tickTimeMs,
  };
}
