const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  riderId: { type: String, required: true }, // reference to Rider
  riderMobile: { type: String, required: true },
  categoryId: { type: String, required: true },
  subcategoryId: { type: String },
  subcategoryName: { type: String },
  carType: { type: String },
  fromLocation: { type: String },
  toLocation: { type: String },
  includeInsurance: { type: Boolean, default: false },
  notes: { type: String },
  selectedCategory: { type: String },
  selectedDate: { type: Date },
  selectedTime: { type: String },
  selectedUsage: { type: String },
  transmissionType: { type: String },
  totalPayable: { type: Number, required: true },
  paymentType: { type: String, enum: ["cash", "online"], required: true },

  // 👇 updated enum with BOOKED flow
  status: { 
    type: String, 
    enum: ["BOOKED", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED"], 
    default: "BOOKED" 
  },
}, { timestamps: true });

module.exports = mongoose.model("Ride", rideSchema);
