const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0 // Amount in rupees
  },
  totalDeposited: {
    type: Number,
    default: 0 // Amount in rupees
  },
  totalSpent: {
    type: Number,
    default: 0 // Amount in rupees
  },
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

module.exports = {  Wallet };