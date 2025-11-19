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
    referralCode: { type: String, unique: true },

    // 🔹 Referral tracking
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", default: null },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rider" }],

    // 🔹 Earnings object
    referralEarning: {
      totalEarnings: { type: Number, default: 0 },   // lifetime earnings
      currentBalance: { type: Number, default: 0 }   // available balance
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