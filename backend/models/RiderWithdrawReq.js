const mongoose = require('mongoose');

const riderWithdrawReqSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi'],
    required: true
  },
  bankDetails: {
    bankAccountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  upiDetails: {
    upiId: String,
    upiQrCode: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const RiderWithdrawReq = mongoose.model('RiderWithdrawReq', riderWithdrawReqSchema);

module.exports = { RiderWithdrawReq };