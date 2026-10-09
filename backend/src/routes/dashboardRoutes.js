const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Both admin and staff can access dashboard statistics
router.use(protect);

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
