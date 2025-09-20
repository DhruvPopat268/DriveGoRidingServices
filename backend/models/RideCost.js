const mongoose = require('mongoose');

const rideCostSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
  priceCategory: { type: mongoose.Schema.Types.ObjectId, ref: "PriceCategory", required: true },
  
  // Base charges (moved from PriceCategory)
  chargePerKm: { type: Number, required: true },
  chargePerMinute: { type: Number, required: true },
  
  // Additional charges
  pickCharges: { type: Number, default: 0 },
  nightCharges: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  extraChargesFromAdmin: { type: Number, default: 0 }, // percentage
  gst: { type: Number, default: 0 }, // percentage
  discount: { type: Number, default: 0 },
  minimumFare: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RideCost', rideCostSchema);