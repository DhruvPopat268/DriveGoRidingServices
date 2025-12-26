// services/adminSessionService.js
const AdminSession = require("../models/AdminSession");

const MAX_SESSIONS = 1;

async function createAdminSession(email, token) {
  // Get all sessions for this admin, sorted oldest first
  const sessions = await AdminSession.find({ email }).sort({ createdAt: 1 });

  if (sessions.length >= MAX_SESSIONS) {
    // Remove oldest session(s) until under the limit
    const excess = sessions.length - MAX_SESSIONS + 1;
    const idsToDelete = sessions.slice(0, excess).map(s => s._id);
    await AdminSession.deleteMany({ _id: { $in: idsToDelete } });
  }

  // Save new session
  const newSession = new AdminSession({ email, token });
  await newSession.save();

  return newSession;
}

async function removeAdminSession(token) {
  await AdminSession.deleteOne({ token });
}

module.exports = { createAdminSession, removeAdminSession };