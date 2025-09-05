const mongoose = require("mongoose");
const { boolean } = require("zod");

const rideSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
  riderMobile: { type: String, required: true },

  // all ride details grouped into rideInfo
  rideInfo: {
    categoryId: { type: String, required: true },
    subcategoryId: { type: String },
    subcategoryName: { type: String },
    carType: { type: String },
    fromLocation: { type: String },
    toLocation: { type: String },
    includeInsurance: { type: Boolean, default: false },
    notes: { type: String },
    selectedCategory: { type: String }, // just category name e.g. "Prime"
    selectedDate: { type: Date },
    selectedTime: { type: String },
    selectedUsage: { type: String },
    transmissionType: { type: String },

    // charge fields
    insuranceCharges: { type: Number, default: 0 },
    cancellationCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    gstCharges: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    adminCharges: { type: Number, default: 0 },
  },
  // to check if referral earning is applied for this ride
  referralEarning: { type: Boolean, default: false },
  referralBalance: { type: Number, default: 0 }, // amount used from referral balance

  totalPayable: { type: Number, required: true },
  paymentType: { type: String, enum: ["cash", "online"], required: true },

  status: {
    type: String,
    enum: ["BOOKED", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED"],
    default: "BOOKED"
  },
}, { timestamps: true });

module.exports = mongoose.model("Ride", rideSchema);
