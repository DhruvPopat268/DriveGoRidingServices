const mongoose = require('mongoose');

const peakSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['peak_hours', 'peak_dates'],
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  startDate: {
    type: String, // or use Date if you're storing it as a Date object
  },
  endDate: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Peak', peakSchema);
