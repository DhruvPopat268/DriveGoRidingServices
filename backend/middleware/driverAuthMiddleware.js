const jwt = require("jsonwebtoken");
const Session = require("../DriverModel/DriverSession");
const Driver = require("../DriverModel/DriverModel");

const authMiddleware = async (req, res, next) => {
  try {
    // console.log("🔹 Incoming request to authMiddleware");
    // console.log("Headers:", req.headers);

    const authHeader = req.headers["authorization"];
    // console.log("Auth Header:", authHeader);

    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // console.log("Extracted Token:", token);

    if (!token) {
      // console.log("❌ No token provided");
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_DRIVER);
      // console.log("✅ Token verified:", decoded);
    } catch (err) {
      console.log("❌ JWT verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // ✅ Check session validity
    const sessions = await Session.find({ mobileNumber: decoded.mobile });
    // console.log("Sessions found:", sessions.length);

    const isValidSession = sessions.some((s) => s.token === token);
    // console.log("Session valid:", isValidSession);

    if (!isValidSession) {
      // console.log("❌ Session expired or not found");
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // ✅ Fetch driver info
    const driverFromDB = await Driver.findOne({ mobile: decoded.mobile });
    // console.log("Driver found:", !!driverFromDB);

    if (!driverFromDB) {
      // console.log("❌ Driver not found in database");
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // ✅ Check current plan and expiry
    const currentPlan = driverFromDB.currentPlan || {};
    // console.log("Current Plan:", currentPlan);

    if (!currentPlan.expiryDate) {
      // console.log("❌ Driver has no expiryDate set in currentPlan");
      return res.status(402).json({
        success: false,
        message: "No active subscription found. Please purchase or renew your plan."
      });
    }

    const now = new Date();
    const expiry = new Date(currentPlan.expiryDate);
    // console.log("Current Date:", now);
    // console.log("Plan Expiry Date:", expiry);

    if (expiry < now) {
      // console.log("❌ Driver plan expired");
      return res.status(402).json({
        success: false,
        message: "Subscription plan expired. Please renew to continue."
      });
    }

    // ✅ Attach driver info and continue
    req.driver = decoded;
    // console.log("✅ Auth successful for driver:", decoded.mobile);
    next();

  } catch (error) {
    // console.error("🔥 AuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;