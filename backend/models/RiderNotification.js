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
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'ride_confirmed',
      'driver_reached',
      'ride_cancelled',
      'partial_ride_cancelled',
      'ride_extended',
      'ride_completed',
      'rating_received',
      'withdrawal_approved',
      'withdrawal_rejected',
      'reschedule_accepted',
      'reschedule_rejected'
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