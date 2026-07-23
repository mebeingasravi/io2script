const STATUS_ON_TIME = '✅'; // checkmark
const STATUS_LATE = '❌'; // cross mark

/**
 * Formats and prints a single tick's validation result and row data to the
 * console using a fixed, human-scannable layout.
 *
 * @param {object} params
 * @param {number} params.tickTimeMs - Tick timestamp in epoch milliseconds.
 * @param {number} params.currentTimeMs - Current processing timestamp in epoch milliseconds.
 * @param {number} params.differenceMs - currentTimeMs - tickTimeMs.
 * @param {boolean} params.isOnTime - Whether currentTimeMs >= tickTimeMs.
 * @param {Record<string, string>} params.data - Parsed CSV row.
 */
export function printTick({ tickTimeMs, currentTimeMs, differenceMs, isOnTime, data }) {
  const statusIcon = isOnTime ? STATUS_ON_TIME : STATUS_LATE;

  const lines = [
    `Tick Time      : ${tickTimeMs}`,
    `Current Time   : ${currentTimeMs}`,
    `Difference(ms) : ${differenceMs}`,
    `Status         : ${statusIcon}`,
    '',
  ];

  for (const [key, value] of Object.entries(data)) {
    lines.push(`${key.padEnd(15, ' ')}: ${value}`);
  }

  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Prints a non-fatal row-level processing error without interrupting the
 * stream.
 *
 * @param {string} message
 * @param {unknown} [cause]
 */
export function printRowError(message, cause) {
  console.error(`[row-error] ${message}${cause ? ` :: ${cause.message || cause}` : ''}`);
}
