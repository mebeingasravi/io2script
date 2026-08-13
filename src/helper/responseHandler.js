/**
 * Builds the `{ statusCode, response }` envelope returned by service-layer
 * methods and sent as-is by controllers via
 * `res.status(result.statusCode).send(result.response)`.
 *
 * Response body shape:
 *   { status: true|false, message: string, data: object }
 */
const responseHandler = {
  /**
   * @param {string} message
   * @param {object|Array} [data={}]
   * @param {number} [statusCode=200]
   */
  success(message, data = {}, statusCode = 200) {
    return {
      statusCode,
      response: { status: true, message, data },
    };
  },

  /**
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {object} [data={}]
   */
  error(message, statusCode = 500, data = {}) {
    return {
      statusCode,
      response: { status: false, message, data },
    };
  },
};

export default responseHandler;
