const mongoose = require('mongoose');

const riderNotificationSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'ride_request',
      'ride_accepted',
      'driver_arrived',
      'trip_started',
      'trip_completed',
      'ride_cancelled',
      'rating_received',
      'wallet_credited',
      'referral_bonus'
    ]
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RiderNotification', riderNotificationSchema);