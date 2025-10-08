
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const subSubCategoryRoutes = require('./routes/subSubCategoryRoutes');
const vehicleCategories = require('./routes/vehicleCategory')
const priceCategoryRoutes = require('./routes/priceCategoryRoutes');
const parcelCategoryRoutes = require('./routes/parcelCategoryRoutes');
const parcelVehicleTypeRoutes = require('./routes/parcelVehicleTypeRoutes');
const ParcelRideCostRoutes = require('./routes/ParcelRideCostRoutes');
const DriverRideCostRoutes = require('./routes/DriverRideCostRoutes');
const peakRoutes = require('./routes/peakRoutes');
const instructionRoutes = require('./routes/instructionRoutes');
const stateRoutes = require('./routes/stateRoutes');
const cityRoutes = require('./routes/cityRoutes');
const carCategoryRoutes = require('./routes/carCategoryRoutes');
const carRoutes = require('./routes/carRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const CabRideCostRoutes = require('./routes/CabRideCostRoutes');

const riderAuthRoutes = require('./routes/riderAuth_otp_Routes');
const connectToDb = require('./database/db');
const cookieParser = require("cookie-parser");
const rideRoutes = require("./routes/rideRoutes");
const referralRulesRoutes = require('./routes/referralRules');
const registrationFeeRoutes = require('./DriverRoutes/RegistrationFeeRoutes');
const subscriptionPlanRoutes = require('./DriverRoutes/SubscriptionPlanRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // origin: [
    //   "http://localhost:8081",
    //   "http://localhost:8080",
    //   "https://journey-cost-estimator.vercel.app",
    //   "https://drive-go-riding-services.vercel.app"
    // ],
    origin: "*",
    credentials: true
  }
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: [
    "http://localhost:8081",
    "http://localhost:8080",
    "https://journey-cost-estimator.vercel.app",
    "https://drive-go-riding-services.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectToDb()

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/subsubcategories', subSubCategoryRoutes);
app.use('/api/vehiclecategories', vehicleCategories)
app.use('/api/price-categories', priceCategoryRoutes);
app.use('/api/parcel-categories', parcelCategoryRoutes);
app.use('/api/parcel-vehicle-types', parcelVehicleTypeRoutes);
app.use('/api/ParcelRideCosts', ParcelRideCostRoutes);
app.use('/api/DriverRideCosts', DriverRideCostRoutes);
app.use('/api/peaks', peakRoutes);
app.use('/api/instructions', instructionRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/car-categories', carCategoryRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/CabRideCosts', CabRideCostRoutes);

// Rider routes
app.use("/api/rider-auth", riderAuthRoutes);

app.use("/api/rides", rideRoutes);

app.use('/api/referral-rules', referralRulesRoutes);
app.use('/api/registration-fees', registrationFeeRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);

// admin
app.use('/api/admin/rides', require('./AdminRoutes/AdminRideRoutes'));

app.use('/api/payments', require('./routes/Payment&Wallet'));

// RBAC routes
app.use('/api/rbac', require('./routes/rbacRoutes'));

// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));

//Driver Mobile Application Routes
app.use('/api/driver', require('./DriverRoutes/DriverRoute'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join driver room when driver connects
  socket.on('join-driver-room', () => {
    socket.join('drivers');
    console.log('Driver joined room:', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

module.exports = app;