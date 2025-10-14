const mongoose = require("mongoose");
const { type } = require("os");

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    address_components: { type: Array }, // optional, store Google Place components
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    place_id: { type: String },
  },
  { _id: false }
);

const personSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
    riderInfo: {
      riderName: { type: String },
      riderMobile: { type: String, required: true }
    },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    driverInfo: {
      driverName: { type: String },
      driverMobile: { type: String }
    },
    rideInfo: {
      categoryId: { type: String, required: true },
      subcategoryId: { type: String },
      categoryName: { type: String },
      subcategoryName: { type: String },
      subSubcategoryName: { type: String },
      subSubcategoryId: { type: String },
      carType: { type: String },
      fromLocation: locationSchema,
      toLocation: locationSchema,

      // ✅ new fields
      senderDetails: personSchema,
      receiverDetails: personSchema,

      includeInsurance: { type: Boolean, default: false },
      notes: { type: String },
      selectedCategoryId: { type: String },
      selectedCategory: { type: String },
      selectedDate: { type: Date },
      selectedTime: { type: String },
      selectedUsage: { type: String },
      SelectedDays: { type: String },
      selectedDates: [{ type: String }],
      transmissionType: { type: String },
      selectedDates: [{ type: String }],

      //for extended 
      extended: { type: Boolean, default: false },
      //extra ride
      extraKm: { type: Number, default: 0 },
      extraMinutes: { type: Number, default: 0 },

      driverReachTime: { type: String },
      ridseStartTime: { type: String },
      rideEndTime: { type: String },

      extraMinutesCharges : { type: Number, default: 0 },
      extraKmCharges : { type: Number, default: 0 },
      
      driverCharges: { type: Number, default: 0 },
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
    driverReason: { type: String },

    status: {
      type: String,
      enum: ["BOOKED", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED", "EXTENDED", "REACHED"],
      default: "BOOKED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);