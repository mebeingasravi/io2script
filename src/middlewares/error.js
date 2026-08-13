import ApiError from '../helper/ApiError.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

/**
 * Normalizes any thrown value (ApiError, Sequelize error, or unknown) into
 * an ApiError before it reaches `errorHandler`.
 *
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorConverter(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, false);
  }

  next(error);
}

/**
 * Final error handler: logs the error and sends the standard
 * `{ status, message, data }` response envelope.
 *
 * @param {ApiError} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error(err);

  const body = { status: false, message, data: {} };

  if (config.nodeEnv === 'development' && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).send(body);
}

export { errorConverter, errorHandler };
