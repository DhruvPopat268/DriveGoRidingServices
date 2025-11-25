const mongoose = require('mongoose');

const parcelRideCostSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  parcelCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParcelCategory',
    required: true
  },
  parcelVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParcelVehicle'
  },
  baseFare: {
    type: Number,
    required: true
  },
  includedKm: {
    type: String,
    required: true
  },
  includedMinutes: {
    type: String,
    required: true
  },
  extraChargePerKm: {
    type: Number,
    required: true
  },
  extraChargePerMinute: {
    type: Number,
    required: true
  },
  pickCharges: {
    type: Number,
    default: 0
  },
  nightCharges: {
    type: Number,
    default: 0
  },
  cancellationFee: {
    type: Number,
    default: 0
  },
  cancellationBufferTime: {
    type: Number,
    default: 0
  },  insurance: {
    type: Number,
    default: 0
  },
  extraChargesFromAdmin: {
    type: Number,
    default: 0
  },
  gst: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  driverCancellationCharges: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ParcelRideCost', parcelRideCostSchema);
