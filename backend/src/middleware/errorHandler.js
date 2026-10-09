const env = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Handle Mongoose CastError (e.g., invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key errors (E11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value '${value}' for field '${field}'. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose schema validation errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new AppError('Validation failed', 400, errors);
};

/**
 * Handle Zod validation errors
 */
const handleZodError = (err) => {
  const errors = (err.issues || []).map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return new AppError('Validation failed', 400, errors);
};

/**
 * Handle JWT signature errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle expired JWT errors
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Centralized global error handling middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal Server Error';
  let errors = error.errors || null;

  // Handle body-parser payload too large
  if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request entity too large. The request body exceeds the 10kb limit.';
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON in request body.';
  } else if (error.name === 'CastError') {
    const appErr = handleCastErrorDB(error);
    statusCode = appErr.statusCode;
    message = appErr.message;
  } else if (error.code === 11000) {
    const appErr = handleDuplicateFieldsDB(error);
    statusCode = appErr.statusCode;
    message = appErr.message;
  } else if (error.name === 'ValidationError') {
    const appErr = handleValidationErrorDB(error);
    statusCode = appErr.statusCode;
    message = appErr.message;
    errors = appErr.errors;
  } else if (error.name === 'ZodError') {
    const appErr = handleZodError(error);
    statusCode = appErr.statusCode;
    message = appErr.message;
    errors = appErr.errors;
  } else if (error.name === 'JsonWebTokenError') {
    const appErr = handleJWTError();
    statusCode = appErr.statusCode;
    message = appErr.message;
  } else if (error.name === 'TokenExpiredError') {
    const appErr = handleJWTExpiredError();
    statusCode = appErr.statusCode;
    message = appErr.message;
  }

  // Obscure non-operational errors in production to avoid leaking sensitive information
  if (env.NODE_ENV === 'production' && !error.isOperational && statusCode === 500) {
    message = 'Something went wrong. Please try again later.';
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Never leak stack traces in production
  if (env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
