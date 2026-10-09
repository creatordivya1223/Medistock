const Medicine = require('../models/Medicine');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/auditLogger');

/**
 * Escapes regex special characters to prevent ReDoS and regex injection.
 * @param {string} string
 * @returns {string}
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * List medicines with search, filtering, sorting, and pagination.
 * GET /api/medicines
 */
const getMedicines = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    stockStatus,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Build MongoDB filter query
  const filter = {};

  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (category) {
    filter.category = category;
  }

  if (stockStatus) {
    if (stockStatus === 'low') {
      filter.stock = { $gte: 1, $lte: 10 };
    } else if (stockStatus === 'out') {
      filter.stock = 0;
    } else if (stockStatus === 'available') {
      filter.stock = { $gt: 0 };
    }
  }

  // 2. Sorting options
  const sortDirection = order === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  // 3. Pagination calculations
  const numericPage = Number(page);
  const numericLimit = Number(limit);
  const skip = (numericPage - 1) * numericLimit;

  // 4. Execute queries concurrently
  const [total, medicines] = await Promise.all([
    Medicine.countDocuments(filter),
    Medicine.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(numericLimit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email'),
  ]);

  const totalPages = Math.ceil(total / numericLimit) || 1;

  res.status(200).json({
    success: true,
    data: medicines,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages,
    },
  });
});

/**
 * Get a single medicine by its ObjectId.
 * GET /api/medicines/:id
 */
const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!medicine) {
    throw new AppError('Medicine not found', 404);
  }

  res.status(200).json({
    success: true,
    data: medicine,
  });
});

/**
 * Create a new medicine record.
 * POST /api/medicines
 */
const createMedicine = asyncHandler(async (req, res) => {
  // Explicitly whitelist input fields
  const { name, price, stock, category, expiry } = req.body;

  const newMedicine = await Medicine.create({
    name,
    price,
    stock,
    category,
    expiry,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  logAudit({
    userId: req.user._id,
    action: 'CREATE_MEDICINE',
    targetId: newMedicine._id,
    metadata: { name: newMedicine.name },
  });

  res.status(201).json({
    success: true,
    data: newMedicine,
  });
});

/**
 * Update an existing medicine record.
 * PUT /api/medicines/:id
 */
const updateMedicine = asyncHandler(async (req, res) => {
  // Explicitly whitelist updatable fields
  const allowedUpdates = ['name', 'price', 'stock', 'category', 'expiry'];
  const updateData = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Stamp current user as editor
  updateData.updatedBy = req.user._id;

  const updatedMedicine = await Medicine.findByIdAndUpdate(req.params.id, updateData, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!updatedMedicine) {
    throw new AppError('Medicine not found', 404);
  }

  logAudit({
    userId: req.user._id,
    action: 'UPDATE_MEDICINE',
    targetId: updatedMedicine._id,
    metadata: { updatedFields: Object.keys(updateData).filter((k) => k !== 'updatedBy') },
  });

  res.status(200).json({
    success: true,
    data: updatedMedicine,
  });
});

/**
 * Delete a medicine record (Admin only).
 * DELETE /api/medicines/:id
 */
const deleteMedicine = asyncHandler(async (req, res) => {
  const deletedMedicine = await Medicine.findByIdAndDelete(req.params.id);

  if (!deletedMedicine) {
    throw new AppError('Medicine not found', 404);
  }

  logAudit({
    userId: req.user._id,
    action: 'DELETE_MEDICINE',
    targetId: deletedMedicine._id,
    metadata: { name: deletedMedicine.name },
  });

  res.status(200).json({
    success: true,
    message: 'Medicine deleted successfully',
  });
});

module.exports = {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
