const express = require('express');
const router = express.Router();
const Peak = require('../models/Peak');

// Create
router.post('/', async (req, res) => {
  try {
    const peak = new Peak(req.body);
    await peak.save();
    res.status(201).json({ success: true, data: peak });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get All
router.get('/', async (req, res) => {
  try {
    const peaks = await Peak.find().sort({ createdAt: -1 });
    res.json({ success: true, data: peaks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const peak = await Peak.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!peak) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: peak });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const peak = await Peak.findByIdAndDelete(req.params.id);
    if (!peak) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
