const express = require('express');
const RiderWalletConfig = require('../models/RiderWalletConfig');
const adminAuthMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Get all rider wallet config entries
router.get('/all',  async (req, res) => {
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
router.post('/',  async (req, res) => {
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