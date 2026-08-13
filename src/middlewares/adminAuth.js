import ApiError from '../helper/ApiError.js';

/**
 * Admin-only guard. Must run after `auth()` has populated `req.user`.
 * Rejects any request whose authenticated user is not an admin.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function adminAuth(req, res, next) {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }

  return next();
}

export default adminAuth;
