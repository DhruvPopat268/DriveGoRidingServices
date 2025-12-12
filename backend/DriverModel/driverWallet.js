const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ride_payment", "withdrawal", "cancellation_charge", "refunded", "incentive", "deposit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride", // applicable for ride or cancellation transactions
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "wallet", "bank_transfer", "upi", "other", "razorpay"],
      default: "wallet",
    },
    withdrawalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WithdrawalRequest",
    },
    // Razorpay fields for deposits
    razorpayPaymentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "partial_refund"],
      default: "pending",
    },
    description: {
      type: String,
    },
    adminRemarks: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const driverWalletSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    totalIncentives: {
      type: Number,
      default: 0,
    },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverWallet", driverWalletSchema);