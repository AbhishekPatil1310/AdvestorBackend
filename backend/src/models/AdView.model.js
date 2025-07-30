// models/AdViewLog.js
const mongoose = require('mongoose');

const adViewLogSchema = new mongoose.Schema({
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: String,
  viewedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdViewLog', adViewLogSchema);
