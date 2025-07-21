const express = require('express');
const User = require('./user');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ error: 'Username already exists' });

    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed', details: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

module.exports = router;