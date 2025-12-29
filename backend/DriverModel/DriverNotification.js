const mongoose = require('mongoose');

const driverNotificationSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
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
      'registration_approved',
      'registration_rejected', 
      'withdrawal_approved',
      'withdrawal_rejected',
      'ride_cancelled',
      'rating_received',
      'reschedule_request'
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

module.exports = mongoose.model('DriverNotification', driverNotificationSchema);