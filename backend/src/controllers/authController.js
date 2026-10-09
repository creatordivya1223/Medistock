const User = require('../models/User');
const { signToken } = require('../utils/token');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/auditLogger');

/**
 * Maximum failed attempts allowed before triggering temporary lockout
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Temporary lockout duration (15 minutes in milliseconds)
 */
const LOCK_TIME_MS = 15 * 60 * 1000;

/**
 * Authenticate user and issue JWT token.
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user by email and explicitly include password for comparison
  const user = await User.findOne({ email }).select('+password');

  // Generic authentication error message to prevent account enumeration
  const invalidAuthMessage = 'Invalid email or password';

  if (!user) {
    throw new AppError(invalidAuthMessage, 401);
  }

  // 2. Reject deactivated accounts
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact an administrator.', 401);
  }

  // 3. Verify account lockout status
  const now = new Date();
  if (user.lockUntil && user.lockUntil > now) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - now.getTime()) / (60 * 1000));
    throw new AppError(
      `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      401
    );
  }

  // 4. Verify candidate password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // Increment failed login attempt counter
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock account if threshold reached
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.failedLoginAttempts = 0;
    }

    await user.save({ validateBeforeSave: false });
    throw new AppError(invalidAuthMessage, 401);
  }

  // 5. Successful login: Reset failed attempts & lockout counter
  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save({ validateBeforeSave: false });
  }

  // 6. Generate JWT token
  const token = signToken(user._id.toString(), user.role);

  res.status(200).json({
    success: true,
    data: {
      token,
      user: user.toJSON(),
    },
  });
});

/**
 * Get current authenticated user profile.
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Change password for currently authenticated user.
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Fetch current user from DB with password field selected
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // 2. Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // 3. Update password (pre-save hook will hash it and set passwordChangedAt)
  user.password = newPassword;
  await user.save();

  logAudit({
    userId: req.user._id,
    action: 'CHANGE_PASSWORD',
    targetId: user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = {
  login,
  getMe,
  changePassword,
};
