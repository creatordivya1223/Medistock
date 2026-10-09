const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generates and signs a JSON Web Token (JWT) using HS256.
 *
 * @param {string} userId - The MongoDB User ID.
 * @param {string} role - The role of the user ('admin' | 'staff').
 * @returns {string} Signed JWT.
 */
const signToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
};

module.exports = {
  signToken,
};
