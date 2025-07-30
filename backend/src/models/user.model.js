const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const diaryEntrySchema = new Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    title: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    mood: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'excited', 'neutral', 'anxious'],
      default: 'neutral',
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { _id: false } // optional: prevents separate ObjectId for each diary entry
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number
    },
    interests: {
      type: [String],
      enum: ['sports', 'music', 'movies', 'travel', 'gaming', 'reading', 'cooking', 'art', 'technology'],
      default: [],
    },
    time: {
      type: [String],
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: [],
    },
    role: {
      type: String,
      enum: ['user', 'advertiser', 'admin'],
      default: 'user',
    },
    ban: {
      isBanned: { type: Boolean, default: false },
      bannedUntil: { type: Date, default: null }
    },
    credit:{
      type: Number,
      default: 0,
      min: 0, // Ensure credit cannot be negative
    },
    totalSpent: {
      type: Number,
      rewuired: true,
      default: 0
    },
    monthlySpent: {
      type: Number,
      default: 0
    },
    lastSpentReset: {
      type: Date,
      default: Date.now
    },
    diaryEntries: [diaryEntrySchema],

  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Skip password hashing for Google OAuth users (they have a placeholder password)
  if (this.password === 'google-oauth-user') return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.isPasswordMatch = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = model('User', userSchema);
