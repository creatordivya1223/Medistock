const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Allow overriding env path (useful for testing and environments)
const envPath = process.env.ENV_FILE
  ? path.resolve(process.env.ENV_FILE)
  : path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string({ required_error: 'MONGO_URI is required' }).min(1, 'MONGO_URI is required'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CLIENT_URL: z.string({ required_error: 'CLIENT_URL is required' }).min(1, 'CLIENT_URL is required'),
  ADMIN_NAME: z.string().optional().default('Admin'),
  ADMIN_EMAIL: z
    .string()
    .email('ADMIN_EMAIL must be a valid email address')
    .optional()
    .default('admin@medistock.com'),
  ADMIN_PASSWORD: z
    .string()
    .refine((val) => !val || val.length >= 8, {
      message: 'ADMIN_PASSWORD must be at least 8 characters long if provided',
    })
    .optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ FATAL CONFIGURATION ERROR: Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    const field = issue.path.join('.') || 'root';
    console.error(`   - [${field}]: ${issue.message}`);
  });
  console.error('\nPlease verify your .env file matches .env.example before starting the server.\n');
  process.exit(1);
}

module.exports = parsed.data;
