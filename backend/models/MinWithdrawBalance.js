const mongoose = require('mongoose');

const minHoldBalanceSchema = new mongoose.Schema({
  minHoldBalance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minWithdrawAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MinHoldBalance', minHoldBalanceSchema);