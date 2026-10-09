const express = require('express');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  validate,
  createUserSchema,
  updateUserSchema,
  adminResetPasswordSchema,
  userQuerySchema,
} = require('../validators');

const router = express.Router();

// All user management routes require authenticated admin access
router.use(protect);
router.use(authorize('admin'));

router
  .route('/')
  .post(validate(createUserSchema, 'body'), userController.createUser)
  .get(validate(userQuerySchema, 'query'), userController.getUsers);

router
  .route('/:id')
  .patch(validateObjectId('id'), validate(updateUserSchema, 'body'), userController.updateUser);

router
  .route('/:id/password')
  .patch(
    validateObjectId('id'),
    validate(adminResetPasswordSchema, 'body'),
    userController.adminResetPassword
  );

module.exports = router;
