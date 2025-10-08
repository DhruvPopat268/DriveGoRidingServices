const jwt = require("jsonwebtoken");
const Session = require("../DriverModel/DriverSession"); // adjust path as needed

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET_DRIVER);

    // ✅ Ensure token exists in Session collection
    // Instead of just one, we allow multiple tokens per mobileNumber
    const sessions = await Session.find({ mobileNumber: decoded.mobile });

    // Check if the provided token is part of the active sessions
    const isValidSession = sessions.some((s) => s.token === token);

    if (!isValidSession) {
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // ✅ Attach user info to request object
    req.driver = decoded;
    console.log(req.driver) // contains { riderId, mobile }
    
    next();
  } catch (error) {
    console.error("AuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;