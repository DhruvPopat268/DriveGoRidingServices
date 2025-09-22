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