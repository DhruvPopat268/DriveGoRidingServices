const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Wallet } = require('../models/Payment&Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const riderId = req.rider.riderId;

    // Validate amount (amount should be in rupees)
    if (!amount || amount < 1 || amount > 50000) {
      return res.status(400).json({ 
        error: 'Invalid amount. Amount should be between ₹1 and ₹50,000' 
      });
    }

    // Convert rupees to paise for Razorpay
    const amountInPaise = amount * 100;

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const options = {
      amount: amountInPaise, // amount in paise
      currency: currency,
      receipt: orderId,
      notes: {
        riderId: riderId,
        purpose: 'wallet_recharge'
      }
    };

    const order = await razorpay.orders.create(options);

    // Find or create wallet and add transaction
    let wallet = await Wallet.findOne({ riderId });
    if (!wallet) {
      wallet = new Wallet({
        riderId: riderId,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        transactions: []
      });
    }

    // Add transaction to wallet
    wallet.transactions.push({
      orderId: orderId,
      razorpayOrderId: order.id,
      amount: amount,
      currency: currency,
      status: 'created',
      type: 'deposit',
      description: 'Wallet recharge via Razorpay',
      notes: options.notes
    });

    await wallet.save();

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      orderId: orderId
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;
    const riderId = req.rider.riderId;

    // Find the wallet and transaction record
    const wallet = await Wallet.findOne({ riderId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const transaction = wallet.transactions.find(t => t.razorpayOrderId === razorpay_order_id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      // Update transaction status to failed
      transaction.status = 'failed';
      await wallet.save();
      
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Payment is valid, update transaction record
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.status = 'paid';
    transaction.paidAt = new Date();
    
    // Get payment details from Razorpay
    try {
      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      transaction.paymentMethod = paymentDetails.method;
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }

    // Update wallet balance (transaction.amount is in rupees)
    wallet.balance += transaction.amount;
    wallet.totalDeposited += transaction.amount;
    wallet.lastTransactionAt = new Date();
    
    await wallet.save();

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      walletBalance: wallet.balance,
      paymentId: razorpay_payment_id
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
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
    const { amount, description = 'Wallet payment' } = req.body;
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
    wallet.transactions.push({
      amount: amount,
      status: 'paid',
      type: 'spend',
      description: description,
      paidAt: new Date()
    });

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

// Webhook to handle Razorpay events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== req.headers['x-razorpay-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      default:
        console.log('Unhandled event:', event.event);
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to handle payment captured event
const handlePaymentCaptured = async (paymentEntity) => {
  try {
    // Find wallet with the transaction
    const wallet = await Wallet.findOne({
      'transactions.razorpayPaymentId': paymentEntity.id
    });

    if (wallet) {
      const transaction = wallet.transactions.find(t => t.razorpayPaymentId === paymentEntity.id);
      
      if (transaction && transaction.status !== 'paid') {
        transaction.status = 'paid';
        transaction.paidAt = new Date();
        
        // Update wallet balance
        wallet.balance += transaction.amount;
        wallet.totalDeposited += transaction.amount;
        wallet.lastTransactionAt = new Date();
        
        await wallet.save();
      }
    }
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
};

// Helper function to handle payment failed event
const handlePaymentFailed = async (paymentEntity) => {
  try {
    const wallet = await Wallet.findOne({
      'transactions.razorpayPaymentId': paymentEntity.id
    });

    if (wallet) {
      const transaction = wallet.transactions.find(t => t.razorpayPaymentId === paymentEntity.id);
      
      if (transaction) {
        transaction.status = 'failed';
        await wallet.save();
      }
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
};

module.exports = router;