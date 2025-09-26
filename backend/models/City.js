const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      minlength: [2, 'City name must be at least 2 characters long'],
      maxlength: [50, 'City name cannot exceed 50 characters'],
    },
    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      required: [true, 'State is required'],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

citySchema.index({ name: 1, state: 1 }, { unique: true });

const City = mongoose.model('City', citySchema);
module.exports = City;