const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const axios = require('axios');
const OfflineStaff = require('../offline&agentBookingModels/offlineStaffModel');
const OfflineStaffSession = require('../offline&agentBookingModels/offlineStaffSessionModel');
const Rider = require('../models/Rider');
const Ride = require('../models/Ride');
const { Wallet } = require('../models/Payment&Wallet');
const { sendOfflineStaffWelcomeEmail } = require('../Services/emailService');
const staffAuthMiddleware = require('../middleware/staffAuthMiddleware');
const { 
  calculateDriverRideCost, 
  calculateCabRideCost, 
  calculateParcelRideCost,
  calculateDriverRideCostWithReferral,
  calculateCabRideCostWithReferral,
  calculateParcelRideCostWithReferral
} = require('../utils/rideCalculation');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const SubSubCategory = require('../models/SubSubCategory');
const { combinedAuthMiddleware } = require('../Services/authService');
const router = express.Router();

// POST - Send OTP (unified for both user and staff)
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Use dummy OTP for testing
    const otp = "123456";
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Ensure Rider exists
    let rider = await Rider.findOne({ mobile });
    if (rider && rider.status === "deleted") {
      return res.status(400).json({ success: false, message: "Rider is already deleted" });
    }
    if (!rider) {
      rider = new Rider({ mobile });
      await rider.save();
    }

    // Save OTP session
    const OtpSession = require('../models/OtpSession');
    const otpSession = new OtpSession({
      rider: rider._id,
      mobile,
      otp,
      otpExpiresAt
    });
    await otpSession.save();

    res.json({
      success: true,
      message: "Dummy OTP generated successfully",
      otp // ⚠️ expose only in dev/testing
    });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate OTP" });
  }
});

// POST - Send OTP via Kaleyra (unified for both user and staff)
/*
router.post('/send-otp', combinedAuthMiddleware, async (req, res) => {
  try {
    const { mobile } = req.body;

    // ✅ Validate mobile number exists
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // ✅ Convert mobile to string if it's a number
    const mobileStr = String(mobile).trim();

    // ✅ Validate mobile number format
    if (!/^\d{10}$/.test(mobileStr) && !/^\+91\d{10}$/.test(mobileStr)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // ✅ Ensure rider exists
    let rider = await Rider.findOne({ mobile: mobileStr });
    if (rider && rider.status === "deleted") {
      return res.status(400).json({ success: false, message: "Rider is already deleted" });
    }
    if (!rider) {
      rider = new Rider({ mobile: mobileStr });
      await rider.save();
    }

    // ✅ Save OTP session in DB
    const OtpSession = require('../models/OtpSession');
    await new OtpSession({
      rider: rider._id,
      mobile: mobileStr,
      otp,
      otpExpiresAt,
    }).save();

    // ✅ Format phone number correctly
    const toNumber = mobileStr.startsWith("+") ? mobileStr : `+91${mobileStr}`;

    // ✅ Build Kaleyra API URL
    const apiUrl = `https://api.kaleyra.io/v1/${process.env.KALEYRA_SID}/messages`;

    // ✅ CORRECT PAYLOAD: body is mandatory, template_params as string
    const payload = {
      to: toNumber,
      sender: process.env.KALEYRA_SENDER_ID,
      type: "TXN",
      template_id: process.env.KALEYRA_TEMPLATE_ID,
      body: `DriveGo OTP is booking confirmation or registration: ${otp}`,
      template_params: otp, // ✅ Just the string value, not object or array
    };

    // ✅ Send OTP via Kaleyra
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "api-key": process.env.KALEYRA_API_KEY,
        "Content-Type": "application/json",
      },
    });

    // ✅ Respond success
    res.json({
      success: true,
      message: "OTP sent successfully",
      otp // ⚠️ expose only in dev/testing
    });
  } catch (error) {
    console.error("Send OTP error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.response?.data || error.message,
    });
  }
});*/

// POST - Create/Save rider profile
router.post('/save-rider-profile', async (req, res) => {
  try {
    const { mobile, name, gender, email, referralCodeUsed } = req.body;
    
    if (!mobile || !name || !gender) {
      return res.status(400).json({ success: false, message: 'Mobile, name and gender are required' });
    }
    
    // Check if rider already exists
    let rider = await Rider.findOne({ mobile });
    
    if (rider) {
      // Update existing rider
      rider.name = name;
      rider.gender = gender;
      rider.email = email || '';
      rider.status = 'active';
      
      // Handle referral code if provided and rider has no referredBy yet
      if (referralCodeUsed && !rider.referredBy) {
        const referrer = await Rider.findOne({ referralCode: referralCodeUsed });
        
        if (!referrer) {
          return res.status(400).json({ success: false, message: 'Invalid referral code' });
        }
        
        rider.referredBy = referrer._id;
        await rider.save();
        
        // Update referrer's list
        referrer.referrals.push({ riderId: rider._id, totalEarned: 0 });
        await referrer.save();
      } else {
        await rider.save();
      }
    } else {
      // Create new rider
      rider = new Rider({
        mobile,
        name,
        gender,
        email: email || '',
        status: 'active'
      });
      
      // Handle referral code if provided
      if (referralCodeUsed) {
        const referrer = await Rider.findOne({ referralCode: referralCodeUsed });
        
        if (!referrer) {
          return res.status(400).json({ success: false, message: 'Invalid referral code' });
        }
        
        rider.referredBy = referrer._id;
        await rider.save();
        
        // Update referrer's list
        referrer.referrals.push({ riderId: rider._id, totalEarned: 0 });
        await referrer.save();
      } else {
        await rider.save();
      }
      
      // Initialize wallet for new rider
      const existingWallet = await Wallet.findOne({ riderId: rider._id });
      if (!existingWallet) {
        await Wallet.create({
          riderId: rider._id,
          balance: 0,
          totalDeposited: 0,
          totalSpent: 0,
          transactions: []
        });
      }
    }
    
    res.json({ success: true, message: 'Rider profile saved successfully', rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Find staff by token (similar to find-rider)
router.get('/find-staff', async (req, res) => {
  try {
    const token = req.cookies.offlineStaffToken;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Find session
    const session = await OfflineStaffSession.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    // Find staff
    const staff = await OfflineStaff.findById(session.staffId)
      .select('name email mobile status completedRides createdAt')
      .populate('completedRides', 'rideId status');
    
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    
    res.json({
      success: true,
      staff: {
        ...staff.toObject(),
        totalCompletedRides: staff.completedRides?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Search riders by mobile
router.get('/search-riders', async (req, res) => {
  try {
    const { mobile } = req.query;
    
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    
    const rider = await Rider.findOne({
      mobile: mobile,
      status: 'active'
    }).select('mobile name email _id gender');
    
    res.json({ success: true, data: rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Create new staff
router.post('/', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const staff = new OfflineStaff({
      name,
      email,
      mobile,
      password: hashedPassword
    });
    
    await staff.save();
    
    // Send welcome email
    try {
      await sendOfflineStaffWelcomeEmail(email, password);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const staff = await OfflineStaff.findOne({ email, status: true });
    if (!staff || !await bcrypt.compare(password, staff.password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session = new OfflineStaffSession({
      staffId: staff._id,
      token,
      expiresAt
    });
    
    await session.save();
    
    // Set token as httpOnly cookie
    res.cookie('offlineStaffToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.hire4drive.com' : undefined,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ success: true, staff: { id: staff._id, email: staff.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.offlineStaffToken;
    
    if (token) {
      // Remove session from database
      await OfflineStaffSession.deleteOne({ token });
    }
    
    // Clear cookie
    res.clearCookie('offlineStaffToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Get all staff
router.get('/', async (req, res) => {
  try {
    const staff = await OfflineStaff.find().select('-password').populate('completedRides', 'rideId status');
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const staff = await OfflineStaff.findById(req.params.id).select('-password').populate('completedRides', 'rideId status createdAt');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Update staff
router.put('/:id', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const updateData = { name, email, mobile };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const staff = await OfflineStaff.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH - Add completed ride
router.patch('/:id/add-ride', async (req, res) => {
  try {
    const { rideId } = req.body;
    const staff = await OfflineStaff.findByIdAndUpdate(
      req.params.id, 
      { $addToSet: { completedRides: rideId } }, 
      { new: true }
    ).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH - Change status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const staff = await OfflineStaff.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST calculate ride cost with referral
router.post('/calculate-ride', staffAuthMiddleware, async (req, res) => {
  try {
    const { categoryId, riderId } = req.body;

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    req.body.rider = rider;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const walletDoc = await Wallet.findOne({ riderId });
    const walletBalance = walletDoc ? walletDoc.balance : 0;

    const categoryName = category.name.toLowerCase();
    let result;

    if (categoryName === 'driver') {
      result = await calculateDriverRideCostWithReferral(req.body);
    } else if (categoryName === 'cab') {
      result = await calculateCabRideCostWithReferral(req.body);
    } else if (categoryName === 'parcel') {
      result = await calculateParcelRideCostWithReferral(req.body);
    } else {
      return res.status(400).json({ message: 'Invalid category type' });
    }

    const totalPayable =
      result.driverCharges +
      result.pickCharges +
      result.peakCharges +
      result.nightCharges +
      result.insuranceCharges +
      result.adminCharges +
      result.gstCharges +
      result.cancellationCharges;

    res.json({ ...result, totalPayable, walletBalance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Current rides for staff
router.get('/current/my-rides', staffAuthMiddleware, async (req, res) => {
  try {
    const { staffId } = req.staff;

    const rides = await Ride.find({ staffId, status: { $in: ['BOOKED', 'CONFIRMED'] } }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(200).json({ success: false, message: 'No booked rides found' });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error('Error fetching booked rides:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Ongoing rides for staff
router.get('/ongoing/my-rides', staffAuthMiddleware, async (req, res) => {
  try {
    const { staffId } = req.staff;

    const rides = await Ride.find({
      staffId, status: { $in: ['ONGOING', 'EXTENDED', 'REACHED'] }
    }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(200).json({ success: false, message: 'No booked rides found' });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error('Error fetching booked rides:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Past rides for staff
router.get('/past/my-rides', staffAuthMiddleware, async (req, res) => {
  try {
    const { staffId } = req.staff;

    const rides = await Ride.find({ staffId, status: { $in: ['COMPLETED', 'CANCELLED'] } }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(200).json({ success: false, message: 'No rides found' });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error('Error fetching rides:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Booking detail
router.post('/bookingDetail', combinedAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: 'Ride ID is required' });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.json({ success: true, data: ride });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;