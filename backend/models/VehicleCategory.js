// models/VehicleCategory.js
const mongoose = require('mongoose');

const vehicleCategorySchema = new mongoose.Schema({
  image: String, // store image URL or path
  vehicleName: { type: String, required: true },
  perKmCharge: { type: Number, required: true },
  perMinuteCharge: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('VehicleCategory', vehicleCategorySchema);
