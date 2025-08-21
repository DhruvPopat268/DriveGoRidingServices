const jwt = require("jsonwebtoken");
const Session = require("../models/Session"); // adjust path as needed

const authMiddleware = async (req, res, next) => {
  try {
    // ✅ Get token from "Authorization: Bearer <token>"
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // ✅ Verify JWT signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Ensure token exists in Session collection
    const session = await Session.findOne({ token, mobileNumber: decoded.mobile });
    if (!session) {
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // ✅ Attach user info to request object
    req.rider = decoded; // contains { riderId, mobile }
    
    next();
  } catch (error) {
    console.error("AuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;