const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration type is required'],
      enum: ['weekly', 'monthly', 'yearly'],
    },
    days: {
      type: Number,
      required: [true, 'Number of days is required'],
      min: [1, 'Days must be at least 1'],
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Plan amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
module.exports = SubscriptionPlan;