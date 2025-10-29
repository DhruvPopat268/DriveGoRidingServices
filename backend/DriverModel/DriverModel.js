const mongoose = require("mongoose");
const { type } = require("os");

const referenceSchema = new mongoose.Schema({
  name: { type: String },
  relationship: { type: String },
  mobileNumber: { type: String }
});

const driverSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },

    personalInformation: {
      fullName: { type: String },
      dateOfBirth: { type: String },
      gender: { type: String, enum: ["Male", "Female", "Other"] },
      alternateNumber: { type: String },
      email: { type: String },
      currentAddress: { type: String },
      permanentAddress: { type: String },

      category: { type: String },
      subCategory: [{ type: String }],

      // ✅ Identity Proofs (Cloudinary URLs)
      aadhar: [{ type: String }],             // array for front & back
      panCard: { type: String },
      drivingLicense: [{ type: String }],     // array for front & back
      passportPhoto: { type: String }         // Selfie / Profile photo
    },

    drivingDetails: {
      drivingExperienceYears: { type: Number },
      licenseType: { type: String, enum: ["LMV", "HMV", "Commercial", "Others"] },
      vehicleType: [{ type: String, enum: ["Manual", "Automatic", "Electric"] }],
      canDrive: [{ type: String }], // Hatchback, Sedan, SUV, Luxury Cars
      preferredWork: { type: String, enum: ["Full-Time", "Part-Time", "Guest/On-Call"] }
    },

    paymentAndSubscription: {
      preferredPaymentCycle: { type: String, enum: ["Daily", "Weekly", "Monthly"] },
      bankAccountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      upiId: {
        type: String,
        validate: {
          validator: function (v) {
            return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v);
          },
          message: 'Invalid UPI ID format. Must be in format: username@provider'
        }
      },
      oneTimeRegistrationFee: { type: Number },
      subscriptionPlan: { type: String },
      // subscriptionAmount: { type: Number },
      // paymentMode: { type: String, enum: ["UPI", "Bank Transfer", "Cash"] }
    },

    languageSkillsAndReferences: {
      knownLanguages: [{ type: String }],
      references: [referenceSchema] // at least 1 required
    },

    declaration: {
      signedAt: { type: Date, default: Date.now },
      signature: { type: String } // store Cloudinary URL of signature image
    },

    status: {
      type: String,
      enum: ["Pending", "Onreview", "Approved", "Rejected", "PendingForPayment"],
      default: "Pending"
    },

    rideStatus: {
      type: String,
      enum: ["WAITING", "ONGOING", "CONFIRMED", "EXTENDED", "REACHED"],
      default: "WAITING"
    },

    currentPlan: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
      expiryDate: { type: Date, default: null }
    },

    purchasedPlans: [{
      _id: false, // 👈 disables auto _id for each object
      paymentId: { type: String, required: true },
      status: { type: String, enum: ["Success", "Failed", "Pending"] },
      plan: { type: String, required: true },
      amount: { type: Number },
      purchasedAt: { type: Date, default: Date.now }
    }],

    driverCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceCategory',
      default: null
    },

    parcelCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParcelCategory',
      default: null
    },

    assignedCar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      default: null
    },

    cancellationRideCredits: { type: Number, default: 3 },
    
    // 🔹 Cancellation charges
    cancellationCharges: { type: Number, default: 0 },
    unclearedCancellationCharges: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;