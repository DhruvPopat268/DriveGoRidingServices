const mongoose = require('mongoose');

const parcelVehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  parcelCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParcelCategory',
    required: true
  },
  parcelVehicleType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParcelVehicleType',
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ParcelVehicle', parcelVehicleSchema);