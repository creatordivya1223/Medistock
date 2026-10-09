const os = require('os');
const mongoose = require('mongoose');
const env = require('./env');

/**
 * Establishes connection to MongoDB via Mongoose.
 * Exits the process on failure.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      runtimeAdapters: { os },
    });
    console.log(` MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
