// models/VehicleCategory.js
const mongoose = require('mongoose');

const vehicleCategorySchema = new mongoose.Schema({
  vehicleName: { type: String, required: true },

}, { timestamps: true });

module.exports = mongoose.model('VehicleCategory', vehicleCategorySchema);
