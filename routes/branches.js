const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

router.get('/', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true });
    res.json(branches);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    // Agar pehli branch hai toh main mark karo
    const count = await Branch.countDocuments();
    if (count === 0) req.body.isMain = true;
    const branch = new Branch(req.body);
    await branch.save();
    res.json({ success: true, branch });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, branch });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (branch.isMain) return res.status(400).json({ message: 'Main branch delete nahi ho sakti!' });
    await Branch.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;