const mongoose = require('mongoose');

const cabRideCostSchema = new mongoose.Schema({
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
  subSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubSubCategory'
  },
  priceCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CarCategory',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  weight: {
    type: Number,
    default: 0
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
  },
  insurance: {
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CabRideCost', cabRideCostSchema);
