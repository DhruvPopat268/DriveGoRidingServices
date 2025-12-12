const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "upi", "cash"],
      default: "bank_transfer",
    },
    // Optional bank/UPI details
    bankDetails: {
      bankAccountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String,
    },
    status: {
      type: String,
      enum: ["pending","rejected", "completed"],
      default: "pending",
    },
    adminRemarks: {
      type: String, // For rejection or notes
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model( "WithdrawalRequest", withdrawalRequestSchema );