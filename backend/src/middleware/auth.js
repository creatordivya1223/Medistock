const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware that authenticates incoming requests via JWT in Authorization header.
 * Attaches verified User document to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  // 1. Extract Bearer token from Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please provide a valid authentication token.', 401));
  }

  // 2. Verify token signature and expiration
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    // Passes to errorHandler which handles JsonWebTokenError / TokenExpiredError
    return next(error);
  }

  // 3. Verify user still exists in database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Verify user account is still active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401));
  }

  // 5. Verify user has not changed password after token was issued
  if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please log in again.', 401));
  }

  // 6. Grant access by attaching user to request
  req.user = currentUser;
  next();
});

/**
 * Role-based authorization middleware.
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
