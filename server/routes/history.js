import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Middleware to authenticate
const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Get User History
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('workoutHistory dietHistory');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add Workout History
router.post('/workout', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const newWorkout = {
      title: req.body.title,
      duration: req.body.duration,
      caloriesBurned: req.body.caloriesBurned,
      exercises: req.body.exercises
    };
    user.workoutHistory.unshift(newWorkout);
    await user.save();
    res.json(user.workoutHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add Diet History
router.post('/diet', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const newDiet = {
      mealName: req.body.mealName,
      calories: req.body.calories,
      protein: req.body.protein,
      carbs: req.body.carbs,
      fat: req.body.fat
    };
    user.dietHistory.unshift(newDiet);
    await user.save();
    res.json(user.dietHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
