const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  userEmail: { type: String },
  comment: { type: String },
  sentiment: { type: String, enum: ['like', 'dislike', 'not-reacted'] },
}, { timestamps: true });


const AdSchema = new mongoose.Schema(
  {
    advertiserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    adType: { type: String, required: true },
    targetAgeGroup: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    views: { type: Number, default: 0 },
    feedbacks: [feedbackSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', AdSchema);
