const mongoose = require("mongoose");

const referenceSchema = new mongoose.Schema({
  name: { type: String },
  relationship: { type: String },
  mobileNumber: { type: String }
});

const driverSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["Pending", "Active", "Onreview"], default: "Pending" },
    personalInformation: {
      fullName: { type: String },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ["Male", "Female", "Other"] },
      mobileNumber: { type: String },
      alternateNumber: { type: String },
      email: { type: String, unique: true, sparse: true },
      currentAddress: { type: String },
      permanentAddress: { type: String }
    },
    drivingDetails: {
      drivingExperienceYears: { type: Number },
      licenseType: { type: String, enum: ["LMV", "HMV", "Commercial", "Others"] },
      vehicleType: { type: String, enum: ["Manual", "Automatic"] },
      canDrive: [{ type: String, enum: ["Hatchback", "Sedan", "SUV", "Luxury Cars"] }],
      preferredWork: { type: String, enum: ["Full-Time", "Guest / On-Call"] }
    },
    paymentAndSubscription: {
      paymentPreference: { type: String, enum: ["Weekly", "Monthly"] },
      bankAccountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      registrationFee: { type: Number },
      subscriptionPlan: { type: String, enum: ["Basic Plan", "Premium Plan"] },
      subscriptionAmount: { type: Number },
      paymentMode: { type: String, enum: ["Bank Transfer", "Cash"] }
    },
    languageSkillsAndReferences: {
      knownLanguages: [{ type: String }],
      references: [referenceSchema]
    },
    declaration: {
      agreement: { type: Boolean },
      applicantSignature: { type: String },
      date: { type: Date }
    }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;