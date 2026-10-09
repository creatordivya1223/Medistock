const express = require('express');
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { validate, alertsQuerySchema } = require('../validators');

const router = express.Router();

// Both admin and staff can access inventory alerts
router.use(protect);

router.get('/', validate(alertsQuerySchema, 'query'), alertController.getAlerts);

module.exports = router;
