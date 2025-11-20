const mongoose = require("mongoose");

const driverIncentiveSchema = new mongoose.Schema(
  {
    drivers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    }],
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverIncentive", driverIncentiveSchema);