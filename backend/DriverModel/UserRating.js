const mongoose = require("mongoose");

const UserRatingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    rideId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    city: {
      type: String
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    /* 🔹 Driver Checkboxes */
    driverFeedback: {
      type: [String],
      default: [],
    },

    /* 🔹 Cab Checkboxes */
    cabFeedback: {
      type: [String],
      default: [],
    },

    /* 🔹 Parcel Checkboxes */
    parcelFeedback: {
      parcelCondition: {
        type: [String], // Delivered Safely, No Damage, Packed Properly
        default: [],
      },
      deliveryExperience: {
        type: [String], // On-Time Delivery, Fast Pickup, Tracking Accurate
        default: [],
      },
    },

    comment: {
      type: String,
      trim: true,
    },

    wouldChooseAgain: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserRating", UserRatingSchema);