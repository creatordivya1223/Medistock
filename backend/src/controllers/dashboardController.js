const Medicine = require('../models/Medicine');
const asyncHandler = require('../utils/asyncHandler');
const {
  LOW_STOCK_THRESHOLD,
  DEFAULT_EXPIRY_DAYS,
} = require('../config/constants');

/**
 * Get comprehensive dashboard inventory statistics using a single MongoDB $facet aggregation pipeline.
 * GET /api/dashboard/stats
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const futureExpiry = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [facetResult] = await Medicine.aggregate([
    {
      $facet: {
        // 1. High-level Inventory KPI Metrics
        metrics: [
          {
            $group: {
              _id: null,
              totalMedicines: { $sum: 1 },
              totalStock: { $sum: '$stock' },
              inventoryValue: {
                $sum: { $multiply: ['$price', '$stock'] },
              },
              lowStock: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$stock', 1] },
                        { $lte: ['$stock', LOW_STOCK_THRESHOLD] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              outOfStock: {
                $sum: {
                  $cond: [{ $eq: ['$stock', 0] }, 1, 0],
                },
              },
              availableUnits: {
                $sum: {
                  $cond: [{ $gt: ['$stock', 0] }, 1, 0],
                },
              },
            },
          },
        ],

        // 2. 5 Most Recently Created Medicines
        recentMedicines: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              expiry: 1,
              createdAt: 1,
            },
          },
        ],

        // 3. Expiring Soon (Within 90 days, not yet expired, limit 5, soonest first)
        expiringSoon: [
          {
            $match: {
              expiry: { $gte: now, $lte: futureExpiry },
            },
          },
          { $sort: { expiry: 1 } },
          { $limit: 5 },
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

        // 4. Category Distribution Breakdown
        categoryBreakdown: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              count: 1,
            },
          },
          { $sort: { category: 1 } },
        ],
      },
    },
  ]);

  const metrics = facetResult.metrics[0] || {
    totalMedicines: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0,
    availableUnits: 0,
    inventoryValue: 0,
  };

  const lowStock = metrics.lowStock || 0;
  const outOfStock = metrics.outOfStock || 0;

  res.status(200).json({
    success: true,
    data: {
      totalMedicines: metrics.totalMedicines || 0,
      totalStock: metrics.totalStock || 0,
      lowStock,
      outOfStock,
      availableUnits: metrics.availableUnits || 0,
      inventoryValue: metrics.inventoryValue || 0,
      attentionRequired: lowStock + outOfStock,
      recentMedicines: facetResult.recentMedicines || [],
      expiringSoon: facetResult.expiringSoon || [],
      categoryBreakdown: facetResult.categoryBreakdown || [],
    },
  });
});

module.exports = {
  getDashboardStats,
};
