const mongoose = require("mongoose");

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
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ["Male", "Female", "Other"] },
      mobileNumber: { type: String },
      alternateNumber: { type: String },
      email: { type: String },
      currentAddress: { type: String },
      permanentAddress: { type: String },

      // ✅ Identity Proofs (Cloudinary URLs)
      aadhar: [{ type: String }],             // array for front & back
      panCard: { type: String },
      drivingLicense: [{ type: String }],     // array for front & back
      passportPhoto: { type: String }         // Selfie / Profile photo
    },

    drivingDetails: {
      drivingExperienceYears: { type: Number },
      licenseType: { type: String, enum: ["LMV", "HMV", "Commercial", "Others"] },
      vehicleType: { type: String, enum: ["Manual", "Automatic"] },
      canDrive: [{ type: String }], // Hatchback, Sedan, SUV, Luxury Cars
      preferredWork: { type: String, enum: ["Full-Time", "Part-Time", "Guest/On-Call"] }
    },

    paymentAndSubscription: {
      preferredPaymentCycle: { type: String, enum: ["Daily", "Weekly", "Monthly"] },
      bankAccountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },

      oneTimeRegistrationFee: { type: Number },
      subscriptionPlan: { type: String, enum: ["Basic", "Standard", "Premium"] },
      subscriptionAmount: { type: Number },
      paymentMode: { type: String, enum: ["UPI", "Bank Transfer", "Cash"] }
    },

    languageSkillsAndReferences: {
      knownLanguages: [{ type: String }],
      references: [referenceSchema] // at least 1 required
    },

    declaration: {
      agreement: { type: Boolean, default: false },
      signedAt: { type: Date }
    },

    status: {
      type: String,
      enum: ["Pending", "Onreview", "Approved", "Rejected"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;