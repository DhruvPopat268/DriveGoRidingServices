const express = require('express');
const router = express.Router();
const RegistrationFee = require('../DriverModel/RegistrationFee');

// Get all registration fees
router.get('/', async (req, res) => {
  try {
    const fees = await RegistrationFee.find().sort({ createdAt: -1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create registration fee
router.post('/', async (req, res) => {
  try {
    const { fee } = req.body;
    
    if (!fee || fee < 0) {
      return res.status(400).json({ success: false, message: 'Valid registration fee is required' });
    }

    const registrationFee = new RegistrationFee({ fee });
    await registrationFee.save();
    
    res.status(201).json({ success: true, data: registrationFee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update registration fee status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const fee = await RegistrationFee.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Registration fee not found' });
    }
    
    res.json({ success: true, data: fee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete registration fee
router.delete('/:id', async (req, res) => {
  try {
    const fee = await RegistrationFee.findByIdAndDelete(req.params.id);
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Registration fee not found' });
    }
    
    res.json({ success: true, message: 'Registration fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;