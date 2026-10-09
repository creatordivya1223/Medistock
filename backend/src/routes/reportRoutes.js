const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Valuation report is strictly admin-only
router.use(protect);
router.use(authorize('admin'));

router.get('/valuation', reportController.getValuationReport);

module.exports = router;
