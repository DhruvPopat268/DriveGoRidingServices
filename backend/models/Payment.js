const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 1, // 1 INR
    max: 50000 // 50,000 INR
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'cancelled'],
    default: 'created'
  },
  paymentMethod: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['deposit', 'spend', 'refund'],
    default: 'deposit'
  },
  description: {
    type: String,
    default: 'Wallet recharge'
  },
  notes: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentSchema.index({ riderId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;