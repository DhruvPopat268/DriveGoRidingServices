const express = require('express');
const router = express.Router();
const { RiderWithdrawReq } = require('../models/RiderWithdrawReq');
const { Wallet } = require('../models/Payment&Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// GET - Fetch withdrawal requests by status
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const withdrawReqs = await RiderWithdrawReq.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: withdrawReqs
    });
  } catch (error) {
    console.error('Fetch withdrawal requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawal requests' });
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
    const wallet = await Wallet.findOne({ riderId: withdrawReq.riderId });
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