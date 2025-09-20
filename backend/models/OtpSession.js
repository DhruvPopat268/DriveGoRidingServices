const mongoose = require("mongoose");

const otpSessionSchema = new mongoose.Schema(
  {
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
    mobile: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired OTP sessions (optional)
otpSessionSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpSession", otpSessionSchema);