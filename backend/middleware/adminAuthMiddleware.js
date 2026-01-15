const jwt = require("jsonwebtoken");
const AdminSession = require("../models/AdminSession");
const User = require("../models/User");

const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from "Authorization: Bearer <token>" OR cookie
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // If no Authorization header, check for cookie
    if (!token && req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Verify JWT signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);

    
    // Ensure token exists in AdminSession collection
    const session = await AdminSession.findOne({ email: decoded.email, token });

    if (!session) {
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // Attach admin info to request object
    req.admin = decoded; // contains { userId, email, role }
    
    // Update lastActivity asynchronously (don't await to avoid slowing down requests)
    const now = new Date();
    User.findByIdAndUpdate(decoded.userId, { lastActivity: now }).catch(err => 
      console.error('Failed to update lastActivity:', err)
    );
    
    next();
  } catch (error) {
    console.error("AdminAuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = adminAuthMiddleware;