const Medicine = require('../models/Medicine');
const asyncHandler = require('../utils/asyncHandler');
const {
  LOW_STOCK_THRESHOLD,
  DEFAULT_EXPIRY_DAYS,
} = require('../config/constants');

/**
 * Get inventory alerts for low stock, out-of-stock, expiring soon, and expired medicines.
 * GET /api/alerts?days=90
 */
const getAlerts = asyncHandler(async (req, res) => {
  const days = req.query.days !== undefined ? Number(req.query.days) : DEFAULT_EXPIRY_DAYS;
  const now = new Date();
  const targetExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [alertsFacet] = await Medicine.aggregate([
    {
      $facet: {
        // 1. Low stock medicines (stock 1-10)
        lowStock: [
          {
            $match: {
              stock: { $gte: 1, $lte: LOW_STOCK_THRESHOLD },
            },
          },
          { $sort: { stock: 1 } },
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              expiry: 1,
            },
          },
        ],

        // 2. Out of stock medicines (stock = 0)
        outOfStock: [
          {
            $match: {
              stock: 0,
            },
          },
          { $sort: { name: 1 } },
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              expiry: 1,
            },
          },
        ],

        // 3. Expiring soon (expiry between now and target date, soonest first)
        expiringSoon: [
          {
            $match: {
              expiry: { $gte: now, $lte: targetExpiry },
            },
          },
          { $sort: { expiry: 1 } },
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              expiry: 1,
            },
          },
        ],

        // 4. Already expired (expiry in the past)
        expired: [
          {
            $match: {
              expiry: { $lt: now },
            },
          },
          { $sort: { expiry: -1 } },
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              expiry: 1,
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      lowStock: alertsFacet.lowStock || [],
      outOfStock: alertsFacet.outOfStock || [],
      expiringSoon: alertsFacet.expiringSoon || [],
      expired: alertsFacet.expired || [],
    },
  });
});

module.exports = {
  getAlerts,
};
