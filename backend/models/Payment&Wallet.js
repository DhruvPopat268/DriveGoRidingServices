const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: false
  },
  razorpayOrderId: {
    type: String,
    required: false
  },
  razorpayPaymentId: {
    type: String,
    required: false
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partial_refund'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['deposit', 'spend', 'refund', 'cancellation_charges', 'withdraw'],
    default: 'deposit'
  },
  description: {
    type: String,
    default: 'Wallet transaction'
  },
  notes: {
    type: Object,
    default: {}
  },
  rideId: {
    type: String,
    required: false
  },
  paidAt: {
    type: Date,
    default: null
  },
  _id: false
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  transactions: [transactionSchema],
  lastTransactionAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = { Wallet };