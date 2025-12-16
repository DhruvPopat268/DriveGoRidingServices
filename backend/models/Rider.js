const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: ""
    },
    email: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    oneSignalPlayerId: { type: String, default: "" },
    referralCode: { type: String, unique: true },

    // 🔹 Referral tracking
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", default: null },
    referrals: [{
      riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
      totalEarned: { type: Number, default: 0 },
      _id: false
    }],

    // 🔹 Earnings object
    referralEarning: {
      totalEarnings: { type: Number, default: 0 },   // lifetime earnings
      currentBalance: { type: Number, default: 0 },   // available balance
      history: [{
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
        amount: { type: Number, required: true },
        type: { 
          type: String, 
          enum: ["rider_completes_ride", "refund", "earning_used_for_book_ride"], 
          required: true 
        },
        createdAt: { type: Date, default: Date.now },
        _id: false
      }]
    },
    
    // 🔹 Cancellation charges
    cancellationCharges: { type: Number, default: 0 },
    unclearedCancellationCharges: { type: Number, default: 0 },

    // 🔹 Ratings tracking
    ratings: {
      ratingHistory: [{ type: Number }],
      avgRating: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// 🔹 Pre-save hook to generate referral code only once
riderSchema.pre("save", function (next) {
  if (!this.referralCode) {
    const year = this.createdAt ? this.createdAt.getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
    const last4 = this._id.toString().slice(-4);
    const namePart = this.name ? this.name.split(" ")[0] : "R"; // use first name
    this.referralCode = `${namePart}${year}${last4}`;
  }
  next();
});

module.exports = mongoose.model("Rider", riderSchema);