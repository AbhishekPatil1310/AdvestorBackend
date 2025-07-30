const crypto = require('crypto');
const { Schema, model } = require('mongoose');
const env = require('../config/env');

const tokenSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

tokenSchema.statics.createHashedToken = function (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = model('Token', tokenSchema);
