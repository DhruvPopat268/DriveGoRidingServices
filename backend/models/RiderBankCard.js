const mongoose = require('mongoose');

// Bank Details Schema
const riderBankDetailsSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'bank_transfer'
  },
  bankAccountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// UPI Details Schema
const riderUpiDetailsSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'upi'
  },
  upiId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  upiQrCode: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
riderBankDetailsSchema.index({ riderId: 1 });
riderUpiDetailsSchema.index({ riderId: 1 });

const RiderBankDetails = mongoose.model('RiderBankDetails', riderBankDetailsSchema);
const RiderUpiDetails = mongoose.model('RiderUpiDetails', riderUpiDetailsSchema);

module.exports = {
  RiderBankDetails,
  RiderUpiDetails
};