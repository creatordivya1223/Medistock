const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

let server;

// Synchronously capture uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down immediately...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

/**
 * Initializes database connection and boots HTTP server.
 */
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start HTTP listener
  const PORT = process.env.PORT || env.PORT || 5000;
  server = app.listen(PORT, () => {
    console.log(`🚀 MediStock API running in [${env.NODE_ENV}] mode on port ${PORT}`);
  });
};

startServer();

// Handle unhandled Promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Closing server gracefully...');
  console.error(err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM (Render / Container shutdown signals)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing server gracefully...');
  if (server) {
    server.close(() => {
      console.log('💥 Process terminated safely.');
    });
  }
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('💥 Process terminated safely.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
