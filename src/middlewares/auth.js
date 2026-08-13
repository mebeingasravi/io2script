import jwt from 'jsonwebtoken';
import ApiError from '../helper/ApiError.js';
import config from '../config/index.js';

/**
 * Authentication middleware factory. Verifies a Bearer JWT from the
 * `Authorization` header and attaches the decoded payload to `req.user`.
 *
 * Usage mirrors the existing route pattern: `auth()` as a middleware factory
 * so it can be composed the same way as other route-level middleware.
 *
 * @returns {import('express').RequestHandler}
 */
function auth() {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(new ApiError(401, 'Authentication token missing'));
    }

    try {
      req.user = jwt.verify(token, config.jwt.secret);
      return next();
    } catch (err) {
      return next(new ApiError(401, `Invalid or expired token: ${err.message}`));
    }
  };
}

export default auth;
