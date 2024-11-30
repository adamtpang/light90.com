import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  whoopToken: {
    type: String,
    required: true,
  },
  preferences: {
    sunlightDelayMinutes: {
      type: Number,
      default: 0, // default to immediate notification
    },
    coffeeDelayMinutes: {
      type: Number,
      default: 90, // default to 90 minutes
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  sleepData: [{
    date: Date,
    wakeTime: Date,
    sleepScore: Number,
    sleepNeed: Number,
    sleepQuality: Number,
  }],
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);