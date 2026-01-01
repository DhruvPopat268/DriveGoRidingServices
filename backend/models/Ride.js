const mongoose = require("mongoose");
const { type } = require("os");

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    houseNo: { type: String, default: "" },
    landmark: { type: String , default: "" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
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
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "OfflineStaff" },
    staffInfo: {
      staffName: { type: String },
      staffMobile: { type: String }
    },
    rideInfo: {
      categoryId: { type: String, required: true },
      subcategoryId: { type: String },
      categoryName: { type: String },
      subcategoryName: { type: String },
      subSubcategoryName: { type: String },
      subSubcategoryId: { type: String },
      carTypeId: { type: String },
      carType: { type: String },
      transmissionTypeId: { type: String },
      transmissionType: { type: String },
      fromLocation: locationSchema,
      toLocation: locationSchema,

      // ✅ new fields
      senderDetails: personSchema,
      receiverDetails: personSchema,

      includeInsurance: { type: Boolean, default: false },
      notes: { type: String },
      selectedCategoryId: { type: String },
      selectedCategory: { type: String },
      selectedCarCategory: { type: String },
      vehicleType: { type: String },
      vehicleTypeId: { type: String },
      selectedCarCategoryId: { type: String },
      selectedParcelCategory: { type: String },
      selectedParcelCategoryId: { type: String },
      selectedDate: { type: Date },
      selectedTime: { type: String },
      selectedUsage: { type: String },
      SelectedDays: { type: String },
      selectedDates: [{ type: String }],
      remainingDates: [{ type: String }],

      completedDays: [{ type: String }],
      completedDates: [{ type: String }],

      //for extended 
      extended: { type: Boolean, default: false },
      //extra ride
      extraKm: { type: Number, default: 0 },
      extraMinutes: { type: Number, default: 0 },

      driverReachTime: { type: String },
      ridseStartTime: { type: String },
      rideEndTime: { type: String },

      weeklyMonthlyRideTimings: [{
        date: { type: String },
        driverReachTime: { type: String },
        rideStartTime: { type: String }, // fixed typo: ridseStartTime → rideStartTime
        rideEndTime: { type: String },
        _id: false
      }],

      extraChargePerKm: { type: Number, default: 0 },
      extraChargePerMinute: { type: Number, default: 0 },
      extraMinutesCharges: { type: Number, default: 0 },
      extraKmCharges: { type: Number, default: 0 },

      driverCharges: { type: Number, default: 0 },
      pickCharges: { type: Number, default: 0 },
      peakCharges: { type: Number, default: 0 },
      nightCharges: { type: Number, default: 0 },
      insuranceCharges: { type: Number, default: 0 },
      cancellationCharges: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      gstCharges: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
      adminCharges: { type: Number, default: 0 },
      adminAddedRideExtraCharges: {
        Charges: { type: Number, default: 0 },
        description: { type: String },
        timestamp: { type: Date, default: Date.now },
        _id: false
      },
    },

    isReferralEarningUsed: { type: Boolean, default: false },
    referralEarningUsedAmount: { type: Number, default: 0 },

    totalPayable: { type: Number, required: true },
    paymentType: { type: String, enum: ["cash", "wallet"], required: true },
    bookedBy: { type: String, enum: ["USER", "STAFF", "AGENT"], default: "USER" },
    cancellationReason: { type: String },
    whoCancel: { type: String, enum: ["Rider", "Driver"] },

    status: {
      type: String,
      enum: ["BOOKED", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED", "EXTENDED", "REACHED"],
      default: "BOOKED",
    },

    // Reschedule tracking
    rescheduleRequest: {
      status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED"], default: null },
      requestedDate: { type: Date },
      requestedTime: { type: String },
      requestedAt: { type: Date },
      respondedAt: { type: Date },
      _id: false
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);