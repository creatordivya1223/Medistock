const { z } = require('zod');
const validate = require('../middleware/validate');

/**
 * Validation schema for user login.
 * Rejects unknown fields via .strict().
 */
const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  })
  .strict();

/**
 * Strong password policy schema:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
const passwordPolicy = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Validation schema for admin creating a new user.
 * Rejects unknown fields via .strict().
 */
const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: passwordPolicy,
    role: z
      .enum(['admin', 'staff'], {
        errorMap: () => ({ message: "Role must be either 'admin' or 'staff'" }),
      })
      .optional()
      .default('staff'),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

/**
 * Validation schema for updating user profile / role / status.
 * Rejects unknown fields via .strict().
 */
const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(50, 'Name cannot exceed 50 characters')
      .optional(),
    role: z
      .enum(['admin', 'staff'], {
        errorMap: () => ({ message: "Role must be either 'admin' or 'staff'" }),
      })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Validation schema for admin resetting a user password.
 */
const adminResetPasswordSchema = z
  .object({
    password: passwordPolicy,
  })
  .strict();

/**
 * Validation schema for user changing their own password.
 */
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password cannot be empty'),
    newPassword: passwordPolicy,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Validation schema for listing users query params.
 */
const userQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(20),
  })
  .strict();

/**
 * Valid medicine categories.
 */
const medicineCategories = ['Tablet', 'Syrup', 'Injection', 'Capsule'];

/**
 * Helper to validate date string (accepts YYYY-MM-DD or full ISO 8601).
 */
const isValidDateString = (val) => {
  const parsed = Date.parse(val);
  return !isNaN(parsed);
};

/**
 * Validation schema for creating a new medicine.
 * Rejects unknown fields via .strict().
 */
const createMedicineSchema = z
  .object({
    name: z
      .string({ required_error: 'Medicine name is required' })
      .trim()
      .min(2, 'Medicine name must be at least 2 characters long')
      .max(100, 'Medicine name cannot exceed 100 characters'),
    price: z
      .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
      .min(0, 'Price must be greater than or equal to 0'),
    stock: z
      .number({ required_error: 'Stock is required', invalid_type_error: 'Stock must be a number' })
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative'),
    category: z.enum(medicineCategories, {
      errorMap: () => ({
        message: `Category must be one of: ${medicineCategories.join(', ')}`,
      }),
    }),
    expiry: z
      .string({ required_error: 'Expiry date is required' })
      .refine(isValidDateString, {
        message: 'Expiry must be a valid date format (e.g. YYYY-MM-DD or ISO 8601)',
      }),
  })
  .strict();

/**
 * Validation schema for updating a medicine.
 * All fields are optional, but at least one must be provided.
 * Rejects unknown fields via .strict().
 */
const updateMedicineSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Medicine name must be at least 2 characters long')
      .max(100, 'Medicine name cannot exceed 100 characters')
      .optional(),
    price: z
      .number({ invalid_type_error: 'Price must be a number' })
      .min(0, 'Price must be greater than or equal to 0')
      .optional(),
    stock: z
      .number({ invalid_type_error: 'Stock must be a number' })
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative')
      .optional(),
    category: z
      .enum(medicineCategories, {
        errorMap: () => ({
          message: `Category must be one of: ${medicineCategories.join(', ')}`,
        }),
      })
      .optional(),
    expiry: z
      .string()
      .refine(isValidDateString, {
        message: 'Expiry must be a valid date format (e.g. YYYY-MM-DD or ISO 8601)',
      })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Validation schema for GET /api/medicines query parameters.
 * Rejects unknown query parameters via .strict().
 */
const medicineQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    category: z
      .enum(medicineCategories, {
        errorMap: () => ({
          message: `Category must be one of: ${medicineCategories.join(', ')}`,
        }),
      })
      .optional(),
    stockStatus: z
      .enum(['low', 'out', 'available'], {
        errorMap: () => ({
          message: "stockStatus must be one of: 'low', 'out', 'available'",
        }),
      })
      .optional(),
    sortBy: z
      .enum(['name', 'price', 'stock', 'expiry', 'createdAt'])
      .optional()
      .default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(20),
  })
  .strict();

const {
  MIN_EXPIRY_DAYS,
  MAX_EXPIRY_DAYS,
  DEFAULT_EXPIRY_DAYS,
} = require('../config/constants');

/**
 * Validation schema for GET /api/alerts query parameters.
 */
const alertsQuerySchema = z
  .object({
    days: z.coerce
      .number()
      .int('Days must be an integer')
      .min(MIN_EXPIRY_DAYS, `Days must be at least ${MIN_EXPIRY_DAYS}`)
      .max(MAX_EXPIRY_DAYS, `Days cannot exceed ${MAX_EXPIRY_DAYS}`)
      .optional()
      .default(DEFAULT_EXPIRY_DAYS),
  })
  .strict();

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  adminResetPasswordSchema,
  changePasswordSchema,
  userQuerySchema,
  alertsQuerySchema,
  passwordPolicy,
  createMedicineSchema,
  updateMedicineSchema,
  medicineQuerySchema,
  validate,
};
