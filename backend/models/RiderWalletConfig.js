const mongoose = require('mongoose');

const riderWalletConfigSchema = new mongoose.Schema({
  minDepositAmount: {
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

module.exports = mongoose.model('RiderWalletConfig', riderWalletConfigSchema);