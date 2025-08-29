const mongoose = require('mongoose');

const rideCostSchema = new mongoose.Schema({
  modelType: { 
    type: String, 
    required: true,
  },
  extraPerKm: { type: Number },
  extraPerMinute: { type: Number },
  pickCharges: { type: Number },
  nightCharges: { type: Number },
  cancellationFee: { type: Number },
  insurance: { type: Number },
  extraChargesFromAdmin: { type: Number }, // percentage
  gst: { type: Number }, // percentage
  discount: { type: Number },
  perKmRate: { type: Number },
  perMinuteRate: { type: Number },
  minimumFare: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('RideCost', rideCostSchema);