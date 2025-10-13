
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

// Global object to store online drivers
const onlineDrivers = {};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id);
  console.log('📊 Total clients:', io.engine.clientsCount);

  // Register driver when they connect
  socket.on('register-driver', async (data) => {
    const { driverId } = data;
    if (driverId) {
      onlineDrivers[driverId] = {
        socketId: socket.id
      };
      socket.join('drivers');
      console.log(`🚗 Driver registered: ${driverId}`);
      console.log(`📊 Online drivers count: ${Object.keys(onlineDrivers).length}`);

      // Send all available BOOKED rides to newly connected driver (only if driver has WAITING status)
      try {
        const Driver = require('./DriverModel/DriverModel');
        const driver = await Driver.findById(driverId);
        
        // Only send rides if driver has WAITING status
        if (driver && driver.rideStatus === 'WAITING') {
          const Ride = require('./models/Ride');
          const availableRides = await Ride.find({ status: 'BOOKED' }).sort({ createdAt: -1 });

          if (availableRides.length > 0) {
            availableRides.forEach(ride => {
              const rideData = {
                rideId: ride._id,
                categoryName: ride.rideInfo.categoryName,
                subcategoryName: ride.rideInfo.subcategoryName,
                subSubcategoryName: ride.rideInfo.subSubcategoryName,
                carType: ride.rideInfo.carType,
                transmissionType: ride.rideInfo.transmissionType,
                selectedUsage: ride.rideInfo.selectedUsage,
                fromLocation: ride.rideInfo.fromLocation,
                toLocation: ride.rideInfo.toLocation,
                selectedDate: ride.rideInfo.selectedDate,
                selectedTime: ride.rideInfo.selectedTime,
                totalPayable: ride.totalPayable,
                status: 'BOOKED'
              };
              socket.emit('new-ride', rideData);
            });
            console.log(`📤 Sent ${availableRides.length} available rides to new driver ${driverId} (WAITING status)`);
          }
        } else {
          console.log(`🚫 Driver ${driverId} does not have WAITING status, no rides sent`);
        }
      } catch (error) {
        console.error('Error sending available rides to new driver:', error);
      }
    }
  });

  // Test event for debugging
  socket.on('test-connection', () => {
    console.log('🧪 Test connection from:', socket.id);
    socket.emit('test-response', { message: 'Connection working!', socketId: socket.id });
  });

  socket.on('disconnect', () => {
    // Remove driver from onlineDrivers when they disconnect
    for (const [driverId, driverData] of Object.entries(onlineDrivers)) {
      if (driverData.socketId === socket.id) {
        delete onlineDrivers[driverId];
        console.log(`🚗 Driver ${driverId} removed from online drivers`);
        break;
      }
    }
    console.log('🔌 Client disconnected:', socket.id);
    console.log('📊 Remaining clients:', io.engine.clientsCount);
    console.log(`📊 Online drivers count: ${Object.keys(onlineDrivers).length}`);
  });
});

// Make onlineDrivers accessible globally
app.set('onlineDrivers', onlineDrivers);

module.exports = app;