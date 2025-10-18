const jwt = require("jsonwebtoken");
const Session = require("../DriverModel/DriverSession"); // adjust path as needed
const Driver = require("../DriverModel/DriverModel");

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
    const sessions = await Session.find({ mobileNumber: decoded.mobile });
    const isValidSession = sessions.some((s) => s.token === token);

    if (!isValidSession) {
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // ✅ Fetch driver from DB to check plan expiry
    const driverFromDB = await Driver.findOne({ mobile: decoded.mobile });

    if (!driverFromDB) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // ✅ Check current plan expiry
    if (driverFromDB.currentPlan?.expiryDate) {
      const now = new Date();
      const expiry = new Date(driverFromDB.currentPlan.expiryDate);

      if (expiry < now) {
        return res.status(402).json({
          success: false,
          message: "Subscription plan expired. Please renew to continue."
        });
      }
    }

    // ✅ Attach user info to request object
    req.driver = decoded;
    next();
  } catch (error) {
    console.error("AuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;