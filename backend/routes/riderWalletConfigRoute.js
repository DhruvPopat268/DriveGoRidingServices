const express = require('express');
const RiderWalletConfig = require('../models/RiderWalletConfig');
const router = express.Router();
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all rider wallet config entries
router.get('/all', adminAuthMiddleware, async (req, res) => {
  try {
    const entries = await RiderWalletConfig.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new rider wallet config entry
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { minDepositAmount, minWithdrawAmount } = req.body;

    if (minDepositAmount < 0 || minWithdrawAmount < 0) {
      return res.status(400).json({ message: 'Values cannot be negative' });
    }

    const newConfig = await RiderWalletConfig.create({
      minDepositAmount: minDepositAmount || 0,
      minWithdrawAmount: minWithdrawAmount || 0
    });

    res.json({
      success: true,
      message: 'Rider wallet configuration created successfully',
      data: newConfig
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;