const mongoose = require('mongoose');

const parcelVehicleTypeSchema = new mongoose.Schema({
  parcelCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ParcelCategory', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  weight: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ParcelVehicleType', parcelVehicleTypeSchema);