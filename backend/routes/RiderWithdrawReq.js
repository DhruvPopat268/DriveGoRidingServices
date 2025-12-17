const express = require('express');
const router = express.Router();
const { RiderWithdrawReq } = require('../models/RiderWithdrawReq');
const { Wallet } = require('../models/Payment&Wallet');
const { RiderBankDetails, RiderUpiDetails } = require('../models/RiderBankCard');
const authMiddleware = require('../middleware/authMiddleware');
const NotificationService = require('../Services/notificationService');
const RiderNotification = require('../models/RiderNotification');
const Rider = require('../models/Rider');

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
    const { amount, paymentMethod, paymentDetailId } = req.body;

    if (!amount || !paymentMethod || !paymentDetailId) {
      return res.status(400).json({ message: 'Amount, payment method, and payment detail ID are required' });
    }

    // Check minimum withdrawal amount
    const RiderWalletConfig = require('../models/RiderWalletConfig');
    const config = await RiderWalletConfig.findOne().sort({ createdAt: -1 });
    const minWithdrawAmount = config?.minWithdrawAmount || 0;
    
    if (amount < minWithdrawAmount) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ₹${minWithdrawAmount}` 
      });
    }

    let selectedPaymentDetails;

    // Validate and fetch selected payment details
    if (paymentMethod === 'bank_transfer') {
      selectedPaymentDetails = await RiderBankDetails.findOne({ _id: paymentDetailId, riderId });
      if (!selectedPaymentDetails) {
        return res.status(400).json({ message: 'Selected bank details not found or not owned by rider' });
      }
    } else if (paymentMethod === 'upi') {
      selectedPaymentDetails = await RiderUpiDetails.findOne({ _id: paymentDetailId, riderId });
      if (!selectedPaymentDetails) {
        return res.status(400).json({ message: 'Selected UPI details not found or not owned by rider' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid payment method. Use bank_transfer or upi' });
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
      paymentDetailId,
      bankDetails: paymentMethod === 'bank_transfer' ? selectedPaymentDetails : undefined,
      upiDetails: paymentMethod === 'upi' ? selectedPaymentDetails : undefined
    });

    // Deduct money immediately and add transaction using atomic operations
    await Wallet.findOneAndUpdate(
      { riderId },
      {
        $inc: { balance: -amount },
        $push: {
          transactions: {
            amount,
            type: 'withdraw',
            status: 'pending',
            description: 'Withdrawal requested by rider',
            withdrawalRequestId: withdrawReq._id
          }
        },
        $set: { lastTransactionAt: new Date() }
      }
    );

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

    // Update transaction status to completed
    const wallet = await Wallet.findOne({ riderId: withdrawReq.riderId });
    if (wallet) {
      const txnIndex = wallet.transactions.findIndex(
        (t) => t.withdrawalRequestId?.toString() === id
      );
      if (txnIndex !== -1) {
        wallet.transactions[txnIndex].status = 'completed';
      }
      wallet.totalSpent += withdrawReq.amount;
      wallet.lastTransactionAt = new Date();
      await wallet.save();
    }

    // Send notification to rider
    try {
      const rider = await Rider.findById(withdrawReq.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const message = `Your withdrawal request of ₹${withdrawReq.amount} has been approved and processed successfully.`;
        
        await NotificationService.sendToUser(
          rider.oneSignalPlayerId,
          'Withdrawal Approved',
          message
        );
        
        await RiderNotification.create({
          riderId: withdrawReq.riderId,
          title: 'Withdrawal Approved',
          message: message,
          categoryId: null,
          type: 'withdrawal_approved'
        });
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
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

    // Refund money back to wallet using atomic operations
    await Wallet.findOneAndUpdate(
      { 
        riderId: withdrawReq.riderId,
        'transactions.withdrawalRequestId': id
      },
      {
        $inc: { balance: withdrawReq.amount },
        $set: {
          'transactions.$.status': 'failed',
          'transactions.$.description': `Withdrawal rejected: ${adminNotes || 'No reason provided'}`,
          lastTransactionAt: new Date()
        }
      }
    );

    // Send notification to rider
    try {
      const rider = await Rider.findById(withdrawReq.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const message = `Your withdrawal request of ₹${withdrawReq.amount} has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : 'Amount has been refunded to your wallet.'}`;
        
        await NotificationService.sendToUser(
          rider.oneSignalPlayerId,
          'Withdrawal Rejected',
          message
        );
        
        await RiderNotification.create({
          riderId: withdrawReq.riderId,
          title: 'Withdrawal Rejected',
          message: message,
          categoryId: null,
          type: 'withdrawal_rejected'
        });
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
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