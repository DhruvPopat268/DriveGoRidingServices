const mongoose = require("mongoose");

const driverStatusLogSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true
    },
    
    status: {
      type: String,
      enum: ["online", "offline"],
      required: true
    },
    
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  { 
    timestamps: true,
    // Index for efficient queries
    indexes: [
      { driverId: 1, timestamp: -1 },
      { status: 1, timestamp: -1 }
    ]
  }
);

const DriverStatusLog = mongoose.model("DriverStatusLog", driverStatusLogSchema);
module.exports = DriverStatusLog;