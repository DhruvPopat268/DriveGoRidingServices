// models/VehicleCategory.js
const mongoose = require('mongoose');

const vehicleCategorySchema = new mongoose.Schema({
  vehicleName: { type: String, required: true },
  DriveVehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicleType', required: true },
  status: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VehicleCategory', vehicleCategorySchema);