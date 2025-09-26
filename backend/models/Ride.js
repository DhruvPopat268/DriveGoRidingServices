const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  address_components: { type: Array }, // optional, store Google Place components
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  place_id: { type: String },
}, { _id: false });

const rideSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
  riderMobile: { type: String, required: true },

  rideInfo: {
    categoryId: { type: String, required: true },
    subcategoryId: { type: String },
    subcategoryName: { type: String },
    carType: { type: String },
    fromLocation: locationSchema, // store as object
    toLocation: locationSchema,   // store as object
    includeInsurance: { type: Boolean, default: false },
    notes: { type: String },
    selectedCategory: { type: String },
    selectedDate: { type: Date },
    selectedTime: { type: String },
    selectedUsage: { type: String },
    transmissionType: { type: String },

    insuranceCharges: { type: Number, default: 0 },
    cancellationCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    gstCharges: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    adminCharges: { type: Number, default: 0 },
  },

  referralEarning: { type: Boolean, default: false },
  referralBalance: { type: Number, default: 0 },

  totalPayable: { type: Number, required: true },
  paymentType: { type: String, enum: ["cash", "wallet"], required: true },

  status: {
    type: String,
    enum: ["BOOKED", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED"],
    default: "BOOKED",
  },
}, { timestamps: true });

module.exports = mongoose.model("Ride", rideSchema);

