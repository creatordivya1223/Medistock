const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, loginSchema, changePasswordSchema } = require('../validators');

const router = express.Router();

/**
 * Strict rate limiter for login endpoint to prevent brute-force attacks:
 * 5 attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.get('/me', protect, authController.getMe);
router.post(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
