import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  workoutHistory: [{
    title: String,
    date: {
      type: Date,
      default: Date.now
    },
    duration: String,
    caloriesBurned: Number,
    exercises: [String]
  }],
  dietHistory: [{
    mealName: String,
    date: {
      type: Date,
      default: Date.now
    },
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  }]
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model('User', UserSchema);
