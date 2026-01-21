const authMiddleware = require('../middleware/authMiddleware');
const staffAuthMiddleware = require('../middleware/staffAuthMiddleware');

// Combined auth middleware that handles both user and staff authentication
const combinedAuthMiddleware = (req, res, next) => {
  console.log("🔐 combinedAuthMiddleware - Starting authentication check");
  console.log("🔐 Request headers:", {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    cookie: req.headers.cookie ? 'Present' : 'Missing'
  });
  
  // Check if request has staff token first
  const staffToken = req.cookies.offlineStaffToken;
  console.log("🔐 Staff token:", staffToken ? 'Present' : 'Missing');
  
  if (staffToken) {
    console.log("🔐 Using staff authentication");
    // Use staff authentication
    return staffAuthMiddleware(req, res, next);
  } else {
    console.log("🔐 Using user authentication");
    // Use user authentication
    return authMiddleware(req, res, next);
  }
};

module.exports = {
  combinedAuthMiddleware,
  authService: combinedAuthMiddleware // For backward compatibility
};