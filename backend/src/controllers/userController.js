const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/auditLogger');

/**
 * Create a new user account (Admin only).
 * POST /api/users
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'staff', isActive = true } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(`A user with email '${normalizedEmail}' already exists.`, 409);
  }

  // 2. Create user (pre-save hook hashes password)
  const newUser = await User.create({
    name,
    email: normalizedEmail,
    password,
    role,
    isActive,
  });

  logAudit({
    userId: req.user._id,
    action: 'CREATE_USER',
    targetId: newUser._id,
    metadata: { role: newUser.role, email: newUser.email },
  });

  res.status(201).json({
    success: true,
    data: newUser.toJSON(),
  });
});

/**
 * List all users with pagination (Admin only).
 * GET /api/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    User.countDocuments(),
    User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: users.map((u) => u.toJSON()),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

/**
 * Update user profile, role, or active status (Admin only).
 * PATCH /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const { name, role, isActive } = req.body;

  // 1. Fetch target user
  const targetUser = await User.findById(targetId);
  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  // 2. Prevent admin from deactivating or demoting themselves
  const isSelf = req.user._id.toString() === targetId;
  if (isSelf) {
    if (role !== undefined && role !== 'admin') {
      throw new AppError('You cannot demote your own account.', 400);
    }
    if (isActive === false) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }
  }

  // 3. Prevent demoting or deactivating the last active admin
  if (targetUser.role === 'admin' && targetUser.isActive) {
    const willDemote = role !== undefined && role !== 'admin';
    const willDeactivate = isActive === false;

    if (willDemote || willDeactivate) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot demote or deactivate the last remaining active admin.', 400);
      }
    }
  }

  // 4. Apply whitelisted updates
  if (name !== undefined) targetUser.name = name;
  if (role !== undefined) targetUser.role = role;
  if (isActive !== undefined) targetUser.isActive = isActive;

  await targetUser.save();

  logAudit({
    userId: req.user._id,
    action: 'UPDATE_USER',
    targetId: targetUser._id,
    metadata: {
      updatedFields: ['name', 'role', 'isActive'].filter((k) => req.body[k] !== undefined),
    },
  });

  res.status(200).json({
    success: true,
    data: targetUser.toJSON(),
  });
});

/**
 * Admin reset a user's password.
 * PATCH /api/users/:id/password
 */
const adminResetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Assign new password; pre-save hook will hash it and set passwordChangedAt
  user.password = password;
  await user.save();

  logAudit({
    userId: req.user._id,
    action: 'RESET_PASSWORD',
    targetId: user._id,
  });

  res.status(200).json({
    success: true,
    message: 'User password reset successfully',
  });
});

module.exports = {
  createUser,
  getUsers,
  updateUser,
  adminResetPassword,
};
