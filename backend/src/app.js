const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const AppError = require('./utils/AppError');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// 1. Trust first proxy (ensures correct client IP for rate limiting behind Render/reverse proxy)
app.set('trust proxy', 1);

// 2. Disable X-Powered-By header to obscure server technology
app.disable('x-powered-by');

// 3. Security HTTP headers with Helmet defaults
app.use(helmet());

// 4. Strict CORS configuration
const clientUrlEnv = process.env.CLIENT_URL || env.CLIENT_URL || '';
const allowedOrigins = clientUrlEnv
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Log parsed allowed origins once at startup for Render logs observability
console.log('🔒 CORS Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, internal health checks) without origin header
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Origin: ${origin}`);
    return callback(new AppError('Blocked by CORS policy: Origin not allowed', 403));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 5. Global rate limiter (100 requests per 15 minutes per IP, skipping OPTIONS preflights)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use(limiter);

// 6. HTTP Request logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
}

// 7. Body parser with 10kb size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 8. Prevent NoSQL query injection by sanitizing $ and . in keys
app.use(mongoSanitize());

// 9. Prevent HTTP Parameter Pollution
app.use(hpp());

// 10. Gzip compression for response bodies
app.use(compression());

// 11. Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
  });
});

// 12. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// 13. 404 Handler for undefined routes
app.use(notFound);

// 14. Centralized global error handler
app.use(errorHandler);

module.exports = app;
