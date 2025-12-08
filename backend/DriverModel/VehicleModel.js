const mongoose = require("mongoose");

const cabVehicleDetailsSchema = new mongoose.Schema({
  vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleType" },
  modelType: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },
  seatCapacity: { type: String },
  color: { type: String },
  fuelType: [{
    type: String,
    enum: ["Petrol", "Diesel", "Electric", "CNG"]
  }],
  vehiclePhotos: [{ type: String }],
  insuranceValidUpto: { type: String },
  pollutionValidUpto: { type: String },
  taxValidUpto: { type: String },
  fitnessValidUpto: { type: String },
  permitValidUpto: { type: String },
  rc: { type: String },
  insurance: { type: String },
  pollutionCertificate: { type: String },
  taxReceipt: { type: String },
  fitnessCertificate: { type: String },
  permit: { type: String },
  _id: false
});

const parcelVehicleDetailsSchema = new mongoose.Schema({
  vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: "ParcelVehicleType" },
  modelType: { type: mongoose.Schema.Types.ObjectId, ref: "ParcelVehicle" },
  length: { type: String },
  width: { type: String },
  height: { type: String },
  weightCapacity: { type: String },
  color: { type: String },
  fuelType: [{
    type: String,
    enum: ["Petrol", "Diesel", "Electric", "CNG"]
  }],
  vehiclePhotos: [{ type: String }],
  insuranceValidUpto: { type: String },
  pollutionValidUpto: { type: String },
  taxValidUpto: { type: String },
  fitnessValidUpto: { type: String },
  permitValidUpto: { type: String },
  rc: { type: String },
  insurance: { type: String },
  pollutionCertificate: { type: String },
  taxReceipt: { type: String },
  fitnessCertificate: { type: String },
  permit: { type: String },
  _id: false
});

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true
  },

  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

  rcNumber: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: async function (value) {
        if (!value) return true;

        // Check for duplicates in Vehicle model only
        const existingVehicle = await mongoose.model('Vehicle').findOne({
          rcNumber: value,
          _id: { $ne: this._id }
        });

        return !existingVehicle;
      },
      message: 'RC Number already exists in the system'
    }
  },

  status: {
    type: Boolean,
    default: true
  },

  adminStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver"
  }],
  cabVehicleDetails: cabVehicleDetailsSchema,
  parcelVehicleDetails: parcelVehicleDetailsSchema

}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);