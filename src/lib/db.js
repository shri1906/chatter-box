// db.js — robust MongoDB connection for custom Node server
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Cache the connection promise so we never open two connections
let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    // Already connected
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    }).then(conn => {
      console.log(`\n✅ MongoDB connected → ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}\n`);
      return conn;
    }).catch(err => {
      connectionPromise = null; // allow retry on next call
      console.error('\n❌ MongoDB connection failed:', err.message);
      console.error('   Make sure MongoDB is running or set MONGODB_URI in .env.local\n');
      throw err;
    });
  }

  return connectionPromise;
}

// Log connection events once
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
  connectionPromise = null;
});
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB error:', err.message);
  connectionPromise = null;
});

module.exports = { connectDB };
