/**
 * Wraps asynchronous route handlers to catch errors and forward them to Express next().
 * @param {Function} fn - Async middleware or route handler function.
 * @returns {Function} Express middleware function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
