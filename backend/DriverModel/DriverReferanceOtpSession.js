const mongoose = require("mongoose");

const DriverReferanceOtpSessionSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired OTP sessions (optional)
DriverReferanceOtpSessionSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("DriverReferanceOtpSession", DriverReferanceOtpSessionSchema);