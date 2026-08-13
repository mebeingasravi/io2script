/**
 * Typed application error carrying an HTTP status code, thrown from
 * validators/services/controllers and translated into a response shape by
 * the `error` middleware.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code to respond with.
   * @param {string} message - Human-readable error message.
   * @param {boolean} [isOperational=true] - Whether this is an expected,
   *   handled failure (vs. a programming bug).
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
