const express = require('express');
const router = express.Router();
const { RiderWithdrawReq } = require('../models/RiderWithdrawReq');
const { Wallet } = require('../models/Payment&Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// GET - Fetch pending withdrawal requests
router.get('/pending', async (req, res) => {
  try {
    const withdrawReqs = await RiderWithdrawReq.find({ status: 'pending' })
      .populate('riderId', 'name mobile email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: withdrawReqs });
  } catch (error) {
    console.error('Fetch pending withdrawal requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending withdrawal requests' });
  }
});

// GET - Fetch approved withdrawal requests
router.get('/approved', async (req, res) => {
  try {
    const withdrawReqs = await RiderWithdrawReq.find({ status: 'approved' })
      .populate('riderId', 'name mobile email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: withdrawReqs });
  } catch (error) {
    console.error('Fetch approved withdrawal requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch approved withdrawal requests' });
  }
});

// GET - Fetch rejected withdrawal requests
router.get('/rejected', async (req, res) => {
  try {
    const withdrawReqs = await RiderWithdrawReq.find({ status: 'rejected' })
      .populate('riderId', 'name mobile email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: withdrawReqs });
  } catch (error) {
    console.error('Fetch rejected withdrawal requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rejected withdrawal requests' });
  }
});

// CREATE - Submit withdrawal request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const { amount, paymentMethod, bankDetails, upiDetails } = req.body;

    if (!amount || !paymentMethod) {
      return res.status(400).json({ message: 'Amount and payment method are required' });
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ riderId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const withdrawReq = await RiderWithdrawReq.create({
      riderId,
      amount,
      paymentMethod,
      bankDetails: paymentMethod === 'bank_transfer' ? bankDetails : undefined,
      upiDetails: paymentMethod === 'upi' ? upiDetails : undefined
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawReq
    });
  } catch (error) {
    console.error('Create withdrawal request error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit withdrawal request' });
  }
});

// APPROVE - Admin approve withdrawal request
router.put('/approve', async (req, res) => {
  try {
    const { id, adminNotes } = req.body;

    const withdrawReq = await RiderWithdrawReq.findByIdAndUpdate(
      id,
      { status: 'approved', adminNotes },
      { new: true }
    );

    if (!withdrawReq) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    // Deduct amount from wallet
    const wallet = await Wallet.findOne({ riderId: withdrawReq.riderId.toString() });
    if (wallet) {
      wallet.balance -= withdrawReq.amount;
      wallet.transactions.push({
        amount: withdrawReq.amount,
        type: 'withdraw',
        status: 'completed',
        description: 'Withdrawal approved'
      });
      await wallet.save();
    }

    res.json({
      success: true,
      message: 'Withdrawal request approved successfully',
      data: withdrawReq
    });
  } catch (error) {
    console.error('Approve withdrawal request error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve withdrawal request' });
  }
});

// REJECT - Admin reject withdrawal request
router.put('/reject', async (req, res) => {
  try {
    const { id, adminNotes } = req.body;

    const withdrawReq = await RiderWithdrawReq.findByIdAndUpdate(
      id,
      { status: 'rejected', adminNotes },
      { new: true }
    );

    if (!withdrawReq) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    res.json({
      success: true,
      message: 'Withdrawal request rejected successfully',
      data: withdrawReq
    });
  } catch (error) {
    console.error('Reject withdrawal request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal request' });
  }
});

module.exports = router;