const mongoose = require('mongoose');

const referralRuleSchema = new mongoose.Schema({
  commission: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  MaxReferrals : {
    type: Number,
    required: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReferralRule', referralRuleSchema);