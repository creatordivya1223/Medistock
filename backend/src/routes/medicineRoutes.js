const express = require('express');
const medicineController = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  validate,
  createMedicineSchema,
  updateMedicineSchema,
  medicineQuerySchema,
} = require('../validators');

const router = express.Router();

// All medicine endpoints require authenticated session
router.use(protect);

router
  .route('/')
  .get(validate(medicineQuerySchema, 'query'), medicineController.getMedicines)
  .post(validate(createMedicineSchema, 'body'), medicineController.createMedicine);

router
  .route('/:id')
  .get(validateObjectId('id'), medicineController.getMedicineById)
  .put(
    validateObjectId('id'),
    validate(updateMedicineSchema, 'body'),
    medicineController.updateMedicine
  )
  .delete(
    validateObjectId('id'),
    authorize('admin'),
    medicineController.deleteMedicine
  );

module.exports = router;
