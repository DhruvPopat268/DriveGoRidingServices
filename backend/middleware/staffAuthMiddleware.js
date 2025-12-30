const OfflineStaffSession = require('../offline&agentBookingModels/offlineStaffSessionModel');
const OfflineStaff = require('../offline&agentBookingModels/offlineStaffModel');

const staffAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.offlineStaffToken;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    
    // Find session and check if it's valid
    const session = await OfflineStaffSession.findOne({ 
      token, 
      expiresAt: { $gt: new Date() } 
    });
    
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    
    // Find staff member
    const staff = await OfflineStaff.findById(session.staffId);
    
    if (!staff || !staff.status) {
      return res.status(401).json({ success: false, message: 'Staff not found or inactive.' });
    }
    
    // Add staff info to request
    req.staff = {
      staffId: staff._id,
      email: staff.email,
      name: staff.name,
      mobile: staff.mobile
    };
    
    next();
  } catch (error) {
    console.error('Staff auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = staffAuthMiddleware;