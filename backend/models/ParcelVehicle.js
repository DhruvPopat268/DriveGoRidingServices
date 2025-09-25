const mongoose = require('mongoose');

const parcelVehicleSchema = new mongoose.Schema({
  vehicleName: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('ParcelVehicle', parcelVehicleSchema);