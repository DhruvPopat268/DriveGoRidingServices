const mongoose = require('mongoose');

const registrationFeeSchema = new mongoose.Schema(
  {
    fee: {
      type: Number,
      required: [true, 'Registration fee is required'],
      min: [0, 'Registration fee cannot be negative'],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const RegistrationFee = mongoose.model('RegistrationFee', registrationFeeSchema);
module.exports = RegistrationFee;