const Session = require("../models/Session");

const MAX_SESSIONS = 2;

async function createSession(mobileNumber, token) {
  // Get all sessions for this user, sorted oldest first
  let sessions = await Session.find({ mobileNumber }).sort({ createdAt: 1 });

  if (sessions.length >= MAX_SESSIONS) {
    // Remove oldest session(s) until we are under the limit
    const excess = sessions.length - MAX_SESSIONS + 1; // how many to delete
    const idsToDelete = sessions.slice(0, excess).map(s => s._id);
    await Session.deleteMany({ _id: { $in: idsToDelete } });
  }

  // Save new session
  const newSession = new Session({ mobileNumber, token });
  await newSession.save();

  return newSession;
}
