const OfflineStaffSession = require('../offline&agentBookingModels/offlineStaffSessionModel');

const createStaffSession = async (staffId, token) => {
  try {
    // Remove any existing sessions for this staff
    await OfflineStaffSession.deleteMany({ staffId });
    
    // Create new session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session = new OfflineStaffSession({
      staffId,
      token,
      expiresAt
    });
    
    await session.save();
    return session;
  } catch (error) {
    console.error('Error creating staff session:', error);
    throw error;
  }
};

const removeStaffSession = async (token) => {
  try {
    await OfflineStaffSession.deleteOne({ token });
  } catch (error) {
    console.error('Error removing staff session:', error);
    throw error;
  }
};

const cleanExpiredStaffSessions = async () => {
  try {
    const result = await OfflineStaffSession.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Cleaned ${result.deletedCount} expired staff sessions`);
  } catch (error) {
    console.error('Error cleaning expired staff sessions:', error);
  }
};

module.exports = {
  createStaffSession,
  removeStaffSession,
  cleanExpiredStaffSessions
};