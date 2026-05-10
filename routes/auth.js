const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, username, password: hashed, role });
    await user.save();
    res.json({ success: true, message: 'User created!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });
    const token = jwt.sign(
  { id: user._id, role: user.role, tenantId: user.tenantId || null },
  process.env.JWT_SECRET
);
    res.json({ success: true, token, user: { name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;