const mongoose = require("mongoose");

const driverSuspendSchema = new mongoose.Schema(
  {
    drivers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    }],
    suspendFrom: {
      type: Date,
      required: true
    },
    suspendTo: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    suspendedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverSuspend", driverSuspendSchema);
