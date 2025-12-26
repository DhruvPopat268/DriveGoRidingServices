const express = require('express');
const router = express.Router();
const RegistrationFee = require('../DriverModel/RegistrationFee');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all registration fees
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const fees = await RegistrationFee.find().sort({ createdAt: -1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create registration fee
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { fee, status } = req.body;

    if (fee === undefined || fee < 0) {
      return res.status(400).json({ success: false, message: 'Valid registration fee is required' });
    }

    // If new fee has status true, set all others to false
    if (status === true) {
      await RegistrationFee.updateMany({ status: true }, { status: false });
    }

    const registrationFee = new RegistrationFee({ fee, status: !!status });
    await registrationFee.save();

    res.status(201).json({ success: true, data: registrationFee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update registration fee status
router.put('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    // ✅ If setting status to true, check if any other document already has true
    if (status === true) {
      const existingTrue = await RegistrationFee.findOne({ status: true, _id: { $ne: req.params.id } });
      if (existingTrue) {
        return res.status(400).json({
          success: false,
          message: 'Another registration fee already has status set to true. Only one can be true at a time.',
        });
      }
    }

    // ✅ Update the document
    const fee = await RegistrationFee.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Registration fee not found',
      });
    }

    res.json({
      success: true,
      data: fee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete registration fee
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
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