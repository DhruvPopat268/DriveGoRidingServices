const mongoose = require("mongoose");

const DriverRatingSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
    rideId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverRating", DriverRatingSchema);