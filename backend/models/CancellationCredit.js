const mongoose = require('mongoose');

const cancellationCreditSchema = new mongoose.Schema({
  credits: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CancellationCredit', cancellationCreditSchema);