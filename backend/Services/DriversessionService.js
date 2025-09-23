// services/sessionService.js
const Session = require("../DriverModel/DriverOtpSession");

const MAX_SESSIONS = 2;

async function createSession(mobileNumber, token) {
  // Get all sessions for this user, sorted oldest first
  const sessions = await Session.find({ mobileNumber }).sort({ createdAt: 1 });

  if (sessions.length >= MAX_SESSIONS) {
    // Remove oldest session(s) until under the limit
    const excess = sessions.length - MAX_SESSIONS + 1;
    const idsToDelete = sessions.slice(0, excess).map(s => s._id);
    await Session.deleteMany({ _id: { $in: idsToDelete } });
  }

  // Save new session
  const newSession = new Session({   // optional but recommended
    mobile: mobileNumber,
    otp: token,             // store OTP as token here
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
  });
  await newSession.save();

  return newSession;
}
module.exports = { createSession };