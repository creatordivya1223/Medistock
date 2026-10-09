const AppError = require('../utils/AppError');

/**
 * 404 Catch-all handler for undefined routes.
 */
const notFound = (req, res, next) => {
  next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
