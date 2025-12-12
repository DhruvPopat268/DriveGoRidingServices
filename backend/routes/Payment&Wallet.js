const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Wallet } = require('../models/Payment&Wallet');
const authMiddleware = require('../middleware/authMiddleware');
const { processDeposit } = require('../utils/depositHandler');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Deposit money to user wallet
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentId } = req.body;
    const riderId = req.rider.riderId;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ riderId });
    if (!wallet) {
      wallet = await Wallet.create({
        riderId,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        transactions: []
      });
    }

    // Check if transaction already exists (webhook processed first)
    const existingTransaction = wallet.transactions.find(
      t => t.razorpayPaymentId === paymentId
    );
    
    if (existingTransaction) {
      return res.status(400).json({ 
        message: 'This payment has already been processed' 
      });
    }

    // Create pending transaction - webhook will update status later
    const transaction = {
      type: 'deposit',
      amount,
      status: 'pending',
      razorpayPaymentId: paymentId,
      description: 'Wallet deposit initiated, awaiting webhook confirmation',
      paymentMethod: 'razorpay'
    };

    wallet.transactions.push(transaction);
    await wallet.save();

    res.json({
      success: true,
      message: 'Deposit initiated, awaiting payment confirmation',
      transaction: wallet.transactions[wallet.transactions.length - 1],
      walletBalance: wallet.balance
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ success: false, message: 'Deposit failed', error: error.message });
  }
});

// Get pending transactions
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      return res.json({ transactions: [], totalItems: 0 });
    }

    const pendingTransactions = wallet.transactions
      .filter(transaction => transaction.status === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(transaction => ({
        id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        razorpayPaymentId: transaction.razorpayPaymentId,
        date: transaction.createdAt
      }));

    res.json({
      transactions: pendingTransactions,
      totalItems: pendingTransactions.length
    });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

// Get completed transactions
router.get('/completed', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      return res.json({ transactions: [], totalItems: 0 });
    }

    const completedTransactions = wallet.transactions
      .filter(transaction => transaction.status === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(transaction => ({
        id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        razorpayPaymentId: transaction.razorpayPaymentId,
        date: transaction.createdAt,
        paidAt: transaction.paidAt
      }));

    res.json({
      transactions: completedTransactions,
      totalItems: completedTransactions.length
    });
  } catch (error) {
    console.error('Get completed transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch completed transactions' });
  }
});

// Get failed transactions
router.get('/failed', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      return res.json({ transactions: [], totalItems: 0 });
    }

    const failedTransactions = wallet.transactions
      .filter(transaction => transaction.status === 'failed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(transaction => ({
        id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        razorpayPaymentId: transaction.razorpayPaymentId,
        date: transaction.createdAt
      }));

    res.json({
      transactions: failedTransactions,
      totalItems: failedTransactions.length
    });
  } catch (error) {
    console.error('Get failed transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch failed transactions' });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    // console.log("History Rider ID:", riderId); // Debug log

    // Build query
    let query = { riderId };

    // Get wallet with transactions
    const wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      return res.json({
        payments: [],
        totalItems: 0
      });
    }

    // Format response from wallet transactions
    const formattedPayments = wallet.transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(transaction => ({
        id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        razorpayPaymentId: transaction.razorpayPaymentId,
        date: transaction.createdAt,
        paidAt: transaction.paidAt
      }));

    res.json({
      payments: formattedPayments,
      totalItems: formattedPayments.length
    });

  } catch (error) {
    console.error('Get history error:', error.message);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get wallet details
router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    // console.log("Wallet Rider ID:", riderId); // Debug log


    let wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      // Create new wallet if doesn't exist
      wallet = new Wallet({
        riderId: riderId,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0
      });
      await wallet.save();
    }

    res.json({
      balance: wallet.balance, // Amount in rupees
      totalDeposited: wallet.totalDeposited, // Amount in rupees
      totalSpent: wallet.totalSpent, // Amount in rupees
      lastTransactionAt: wallet.lastTransactionAt,
      isActive: wallet.isActive
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet details' });
  }
});

// Deduct money from wallet (for ride payments, etc.)
router.post('/deduct', authMiddleware, async (req, res) => {
  try {
    const { amount, description = 'Wallet payment', rideId } = req.body;
    const riderId = req.rider.riderId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const wallet = await Wallet.findOne({ riderId });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Add spend transaction to wallet
    const transaction = {
      amount: amount,
      status: 'completed',
      type: 'spend',
      description: description,
      paidAt: new Date()
    };
    
    if (rideId) {
      transaction.rideId = rideId;
    }
    
    wallet.transactions.push(transaction);

    // Update wallet
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    wallet.lastTransactionAt = new Date();
    
    await wallet.save();

    res.json({ 
      success: true, 
      message: 'Amount deducted successfully',
      walletBalance: wallet.balance,
      transactionId: wallet.transactions[wallet.transactions.length - 1]._id
    });

  } catch (error) {
    console.error('Deduct money error:', error);
    res.status(500).json({ error: 'Failed to deduct money' });
  }
});

// Webhook for Razorpay payment updates
router.post('/webhook', async (req, res) => {
  try {
    const webhookPayload = req.body;
    const receivedSignature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature
    if (!receivedSignature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('⚠️ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      console.error('⚠️ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    // Extract payment info from Razorpay webhook payload
    const event = webhookPayload.event;
    const paymentEntity = webhookPayload.payload?.payment?.entity;
    const orderEntity = webhookPayload.payload?.order?.entity;
    
    if (!paymentEntity || !paymentEntity.id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const payment_id = paymentEntity.id;
    const status = paymentEntity.status;
    const webhookAmount = paymentEntity.amount ? paymentEntity.amount / 100 : null; // Convert paise to rupees
    
    // Get payment notes from order or payment entity
    const notes = orderEntity?.notes || paymentEntity.notes || {};

    // Only process supported payment events
    const supportedEvents = ['payment.captured', 'payment.failed', 'payment.authorized', 'payment.refunded'];
    if (!supportedEvents.includes(event)) {
      return res.json({ status: 'ignored', event, reason: 'Unsupported event type' });
    }

    const result = await processDeposit(payment_id, status, webhookAmount, notes);
    
    if (result.success) {
      return res.json({ status: 'ok', event, verified: true, result: result.details });
    } else {
      return res.json({ status: 'error', event, error: result.error });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;