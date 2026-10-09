const Medicine = require('../models/Medicine');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get financial inventory valuation report grouped by medicine and category.
 * GET /api/reports/valuation (Admin Only)
 */
const getValuationReport = asyncHandler(async (req, res) => {
  const [reportFacet] = await Medicine.aggregate([
    {
      $facet: {
        // 1. High-level Inventory Valuation Summary
        overview: [
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              totalUnits: { $sum: '$stock' },
              totalInventoryValue: {
                $sum: { $multiply: ['$price', '$stock'] },
              },
            },
          },
        ],

        // 2. Per-Medicine rows sorted by total value descending
        medicines: [
          {
            $project: {
              id: '$_id',
              _id: 0,
              name: 1,
              category: 1,
              price: 1,
              stock: 1,
              totalValue: { $multiply: ['$price', '$stock'] },
            },
          },
          { $sort: { totalValue: -1, name: 1 } },
        ],

        // 3. Category-level aggregate valuation
        categoryValuation: [
          {
            $group: {
              _id: '$category',
              totalItems: { $sum: 1 },
              totalUnits: { $sum: '$stock' },
              totalValue: {
                $sum: { $multiply: ['$price', '$stock'] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              totalItems: 1,
              totalUnits: 1,
              totalValue: 1,
            },
          },
          { $sort: { totalValue: -1, category: 1 } },
        ],
      },
    },
  ]);

  const overview = reportFacet.overview[0] || {
    totalItems: 0,
    totalUnits: 0,
    totalInventoryValue: 0,
  };

  res.status(200).json({
    success: true,
    data: {
      totalItems: overview.totalItems,
      totalUnits: overview.totalUnits,
      totalInventoryValue: overview.totalInventoryValue,
      medicines: reportFacet.medicines || [],
      categoryValuation: reportFacet.categoryValuation || [],
    },
  });
});

module.exports = {
  getValuationReport,
};
