const mongoose = require('mongoose');

const offlineStaffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobile: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  completedRides: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  }],
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OfflineStaff', offlineStaffSchema);