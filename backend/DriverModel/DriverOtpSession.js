const mongoose = require("mongoose");

const DriverotpSessionSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    mobile: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired OTP sessions (optional)
DriverotpSessionSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("DriverOtpSession", DriverotpSessionSchema);