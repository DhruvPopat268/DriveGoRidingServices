const authMiddleware = require('../middleware/authMiddleware');
const staffAuthMiddleware = require('../middleware/staffAuthMiddleware');

// Combined auth middleware that handles both user and staff authentication
const combinedAuthMiddleware = (req, res, next) => {
  // Check if request has staff token first
  const staffToken = req.cookies.offlineStaffToken;
  
  if (staffToken) {
    // Use staff authentication
    return staffAuthMiddleware(req, res, next);
  } else {
    // Use user authentication
    return authMiddleware(req, res, next);
  }
};

module.exports = {
  combinedAuthMiddleware,
  authService: combinedAuthMiddleware // For backward compatibility
};