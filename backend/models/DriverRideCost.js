const mongoose = require('mongoose');

const DriverRideCostSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
  subSubCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubSubCategory" },
  priceCategory: { type: mongoose.Schema.Types.ObjectId, ref: "PriceCategory", required: true },
  
  // Base fare and included limits
  baseFare: { type: Number, required: true },
  includedKm: { type: String, required: true },
  includedMinutes: { type: String, required: true },
  
  // Extra charges beyond included limits
  extraChargePerKm: { type: Number, required: true },
  extraChargePerMinute: { type: Number, required: true },

  weight: { type: Number }, // Optional, only required for parcel categories

  // Additional charges (amounts in rupees)
  pickCharges: { type: Number, default: 0 },
  nightCharges: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  cancellationBufferTime: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  extraChargesFromAdmin: { type: Number, default: 0 }, // percentage
  gst: { type: Number, default: 0 }, // percentage
  discount: { type: Number, default: 0 },
  minimumFare: { type: Number, default: 0 },
  driverCancellationCharges: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('RideCost', DriverRideCostSchema);