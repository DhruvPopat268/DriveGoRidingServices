const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transactionType: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["DRIVER_REGISTRATION_OR_SUBSCRIPTION_PLAN_PURCHASE", "RIDE_PAYMENT", "RIDE_COMMISSION", "OTHER", "DRIVER_PAYOUT", "DRIVER_INCENTIVE", "REFERRAL_BONUS"], required: true },
  status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"], default: "COMPLETED" }
}, { timestamps: true });

const adminWalletLedgerSchema = new mongoose.Schema({
  currentBalance: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  totalDebits: { type: Number, default: 0 },
  transactions: [transactionSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

adminWalletLedgerSchema.methods.addTransaction = function(transactionData) {
  const balanceAfter = transactionData.transactionType === "CREDIT" 
    ? this.currentBalance + transactionData.amount 
    : this.currentBalance - transactionData.amount;

  const transaction = {
    ...transactionData
  };

  this.transactions.push(transaction);
  this.currentBalance = balanceAfter;
  
  if (transactionData.transactionType === "CREDIT") {
    this.totalCredits += transactionData.amount;
  } else {
    this.totalDebits += transactionData.amount;
  }
  
  this.lastUpdated = new Date();
  return transaction;
};

const AdminWalletLedger = mongoose.model("AdminWalletLedger", adminWalletLedgerSchema);
module.exports = AdminWalletLedger;