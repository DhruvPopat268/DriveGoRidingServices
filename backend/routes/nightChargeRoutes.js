const express = require('express');
const router = express.Router();
const NightCharge = require('../models/NightCharge');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Create
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const nightCharge = new NightCharge(req.body);
    await nightCharge.save();
    res.status(201).json({ success: true, data: nightCharge });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get All
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const nightCharges = await NightCharge.find().sort({ createdAt: -1 });
    res.json({ success: true, data: nightCharges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const nightCharge = await NightCharge.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!nightCharge) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: nightCharge });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Toggle Status
router.patch('/:id/toggle-status', adminAuthMiddleware, async (req, res) => {
  try {
    const nightCharge = await NightCharge.findById(req.params.id);
    if (!nightCharge) return res.status(404).json({ success: false, message: 'Not found' });
    
    nightCharge.status = !nightCharge.status;
    await nightCharge.save();
    res.json({ success: true, data: nightCharge });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const nightCharge = await NightCharge.findByIdAndDelete(req.params.id);
    if (!nightCharge) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;