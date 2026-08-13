/**
 * In-memory registry mapping a script_id to its live child process handle.
 * Actual OS process handles only ever exist inside this Node process, so
 * this registry — not the database — is the source of truth for "is this
 * script's process actually alive right now". The database only stores the
 * last-known status/PID for visibility and auditing.
 *
 * Kept as a small, swappable module: a future multi-instance deployment
 * could replace this with a Redis-backed PID registry (as noted in the
 * spec) without changing any calling code's shape.
 */
const runningProcesses = new Map();

const processRegistry = {
  /**
   * @param {string} scriptId
   * @param {{ pid: number, child: import('node:child_process').ChildProcess }} entry
   */
  set(scriptId, entry) {
    runningProcesses.set(scriptId, entry);
  },

  /**
   * @param {string} scriptId
   * @returns {{ pid: number, child: import('node:child_process').ChildProcess } | undefined}
   */
  get(scriptId) {
    return runningProcesses.get(scriptId);
  },

  /**
   * @param {string} scriptId
   */
  has(scriptId) {
    return runningProcesses.has(scriptId);
  },

  /**
   * @param {string} scriptId
   */
  remove(scriptId) {
    runningProcesses.delete(scriptId);
  },

  clear() {
    runningProcesses.clear();
  },
};

export default processRegistry;
