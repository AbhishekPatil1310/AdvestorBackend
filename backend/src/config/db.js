const mongoose = require('mongoose');
const env = require('./env');

async function connectDB(fastify) {
  try {
    await mongoose.connect(env.MONGO_URI);
    fastify.log.info('MongoDB connected');
  } catch (err) {
    fastify.log.error(err, 'MongoDB connection error');
    process.exit(1);
  }
}

module.exports = connectDB;
