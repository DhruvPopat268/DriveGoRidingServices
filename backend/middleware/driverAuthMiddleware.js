const jwt = require("jsonwebtoken");
const Session = require("../DriverModel/DriverSession");
const Driver = require("../DriverModel/DriverModel");
const DriverSuspend = require("../models/DriverSuspend");

const authMiddleware = async (req, res, next) => {
  try {


    const authHeader = req.headers["authorization"];


    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  

    if (!token) {
    
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_DRIVER);
    
    } catch (err) {
     
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // ✅ Check session validity
    const sessions = await Session.find({ mobileNumber: decoded.mobile });


    const isValidSession = sessions.some((s) => s.token === token);


    if (!isValidSession) {
    
      return res.status(401).json({ success: false, message: "Session expired or not found" });
    }

    // ✅ Fetch driver info
    const driverFromDB = await Driver.findOne({ mobile: decoded.mobile });
 

    if (!driverFromDB) {
   
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // ✅ Check if driver is suspended
    if (driverFromDB.status === "Suspended") {
      const suspendRecord = await DriverSuspend.findOne({
        drivers: driverFromDB._id
      }).sort({ createdAt: -1 });

      if (suspendRecord) {
        const now = new Date();
        const suspendFrom = new Date(suspendRecord.suspendFrom);
        const suspendTo = new Date(suspendRecord.suspendTo);

        if (now < suspendFrom) {
          // Suspension hasn't started yet - revert to Approved
          driverFromDB.status = "Approved";
          await driverFromDB.save();
        } else if (now >= suspendFrom && now <= suspendTo) {
          // Currently suspended - block access
          return res.status(403).json({
            success: false,
            message: "Your account is suspended",
            suspendFrom: suspendFrom,
            suspendTo: suspendTo,
            reason: suspendRecord.description
          });
        } else if (now > suspendTo) {
          // Suspension period ended - revert to Approved
          driverFromDB.status = "Approved";
          await driverFromDB.save();
        }
      } else {
        // No suspend record found - revert to Approved
        driverFromDB.status = "Approved";
        await driverFromDB.save();
      }
    }

    // ✅ Check current plan and expiry
    const currentPlan = driverFromDB.currentPlan || {};


    // ✅ Only check expiry if expiryDate exists
    if (currentPlan.expiryDate) {
      const now = new Date();
      const expiry = new Date(currentPlan.expiryDate);

      if (expiry < now) {
     
        return res.status(402).json({
          success: false,
          message: "Subscription plan expired. Please renew to continue."
        });
      }
    }

    // ✅ Attach driver info and continue
    req.driver = decoded;
 
    next();

  } catch (error) {
    // console.error("🔥 AuthMiddleware error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;