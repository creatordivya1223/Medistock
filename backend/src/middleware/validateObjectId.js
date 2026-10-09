const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Reusable middleware to validate MongoDB ObjectId route parameters.
 * @param {string} [paramName='id'] - The name of the request parameter to validate.
 * @returns {import('express').RequestHandler}
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName} format: '${id}'`, 400));
    }

    next();
  };
};

module.exports = {
  validateObjectId,
};
