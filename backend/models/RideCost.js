const mongoose = require('mongoose');

const rideCostSchema = new mongoose.Schema({
  modelType: { 
    type: String, 
    required: true,
    enum: ['oneway', 'roundtrip', 'hourly', 'monthly', 'weekly']
  },
  
  // Common field for all model types
  baseFare: { type: Number, required: true },
  
  // Fields for comprehensive models (oneway/hourly)
  minKmIncluded: { type: Number },
  extraPerKm: { type: Number },
  includedMinutes: { type: Number },
  extraPerMinute: { type: Number },
  pickCharges: { type: Number },
  nightCharges: { type: Number },
  cancellationFee: { type: Number },
  insurance: { type: Number },
  extraChargesFromAdmin: { type: Number }, // percentage
  gst: { type: Number }, // percentage
  discount: { type: Number },
  // peakHoursChargePerKm: { type: Number },
  // peakHoursChargePerMinute: { type: Number },
  // peakDateChargePerKm: { type: Number },
  // peakDateChargePerMinute: { type: Number },
  
  // Fields for simple models (roundtrip/monthly/weekly)
  perKmRate: { type: Number },
  perMinuteRate: { type: Number },
  minimumFare: { type: Number }
}, { timestamps: true });

// Pre-save middleware to validate required fields based on model type
rideCostSchema.pre('save', function(next) {
  const comprehensiveModels = ['oneway', 'hourly'];
  const simpleModels = ['roundtrip', 'monthly', 'weekly'];
  
  if (comprehensiveModels.includes(this.modelType)) {
    // Validate comprehensive model fields
    const requiredFields = [
      'minKmIncluded', 'extraPerKm', 'includedMinutes', 'extraPerMinute',
      'pickCharges', 'nightCharges', 'cancellationFee', 'insurance',
      'extraChargesFromAdmin', 'gst', 'discount', 
      // 'peakHoursChargePerKm','peakHoursChargePerMinute', 'peakDateChargePerKm', 'peakDateChargePerMinute'
    ];
    
    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        return next(new Error(`${field} is required for ${this.modelType} model`));
      }
    }
    
    // Clear simple model fields if they exist
    this.perKmRate = undefined;
    this.perMinuteRate = undefined;
    this.minimumFare = undefined;
    
  } else if (simpleModels.includes(this.modelType)) {
    // Validate simple model fields
    const requiredFields = ['perKmRate', 'perMinuteRate', 'minimumFare'];
    
    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        return next(new Error(`${field} is required for ${this.modelType} model`));
      }
    }
    
    // Clear comprehensive model fields if they exist
    const comprehensiveFields = [
      'minKmIncluded', 'extraPerKm', 'includedMinutes', 'extraPerMinute',
      'pickCharges', 'nightCharges', 'cancellationFee', 'insurance',
      'extraChargesFromAdmin', 'gst', 'discount', 
      // 'peakHoursChargePerKm', 'peakHoursChargePerMinute', 'peakDateChargePerKm', 'peakDateChargePerMinute'
    ];
    
    comprehensiveFields.forEach(field => {
      this[field] = undefined;
    });
  }
  
  next();
});

module.exports = mongoose.model('RideCost', rideCostSchema);