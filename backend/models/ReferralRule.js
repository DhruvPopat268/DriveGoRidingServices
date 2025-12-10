const mongoose = require('mongoose');

const referralRuleSchema = new mongoose.Schema({
  commission: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  MaxReferrals: {
    type: Number,
    required: true
  },
  allowCommissionToUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReferralRule', referralRuleSchema);