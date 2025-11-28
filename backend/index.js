
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
const parcelVehicleRoutes = require('./routes/parcelVehicleRoutes');
const ParcelRideCostRoutes = require('./routes/ParcelRideCostRoutes');
const DriverRideCostRoutes = require('./routes/DriverRideCostRoutes');
const peakRoutes = require('./routes/peakRoutes');
const instructionRoutes = require('./routes/instructionRoutes');
const stateRoutes = require('./routes/stateRoutes');
const cityRoutes = require('./routes/cityRoutes');
const carCategoryRoutes = require('./routes/carCategoryRoutes');
const cabVehicleTypeRoutes = require('./routes/cabVehicleTypeRoutes');
const parcelVehicleTypeRoutes = require('./routes/parcelVehicleTypeRoutes');
const carRoutes = require('./routes/carRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const CabRideCostRoutes = require('./routes/CabRideCostRoutes');
const serviceWalletBalanceRoutes = require('./routes/serviceWalletBalanceRoutes');

const riderAuthRoutes = require('./routes/riderAuth_otp_Routes');
const connectToDb = require('./database/db');
const cookieParser = require("cookie-parser");
const rideRoutes = require("./routes/rideRoutes");
const referralRulesRoutes = require('./routes/referralRules');
const registrationFeeRoutes = require('./DriverRoutes/RegistrationFeeRoutes');
const subscriptionPlanRoutes = require('./DriverRoutes/SubscriptionPlanRoutes');
const userRatingRoutes = require('./DriverRoutes/UserRatingRoutes');
const driverRatingRoutes = require('./DriverRoutes/DriverRatingRoutes');

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
app.use('/api/parcelVehicles', parcelVehicleRoutes);
app.use('/api/ParcelRideCosts', ParcelRideCostRoutes);
app.use('/api/DriverRideCosts', DriverRideCostRoutes);
app.use('/api/peaks', peakRoutes);
app.use('/api/instructions', instructionRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/car-categories', carCategoryRoutes);
app.use('/api/cabVehicleTypes', cabVehicleTypeRoutes);
app.use('/api/parcelVehicleTypes', parcelVehicleTypeRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/upload', uploadRoutes);
console.log('✅ Test upload routes registered at /api/test-upload');
app.use('/api/CabRideCosts', CabRideCostRoutes);
app.use('/api/service-wallet-balances', serviceWalletBalanceRoutes);

const path = require("path");

// ✅ Serve images & documents inside /cloud folder
app.use("/cloud/images", express.static(path.join(__dirname, "cloud/images")));
app.use("/cloud/documents", express.static(path.join(__dirname, "cloud/documents")));

// ✅ Serve images & documents with /app prefix for production URLs
app.use("/app/cloud/images", express.static(path.join(__dirname, "cloud/images")));
app.use("/app/cloud/documents", express.static(path.join(__dirname, "cloud/documents")));

// Rider routes
app.use("/api/rider-auth", riderAuthRoutes);

app.use("/api/rides", rideRoutes);

app.use('/api/referral-rules', referralRulesRoutes);
app.use('/api/registration-fees', registrationFeeRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/user-rating', userRatingRoutes);
app.use('/api/driver-rating', driverRatingRoutes);

// admin
app.use('/api/admin/rides', require('./AdminRoutes/AdminRideRoutes'));

app.use('/api/payments', require('./routes/Payment&Wallet'));

// RBAC routes
app.use('/api/rbac', require('./routes/rbacRoutes'));

// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));

//Driver Mobile Application Routes
app.use('/api/driver', require('./DriverRoutes/DriverRoute'));
app.use('/api/driver/vehicles', require('./DriverRoutes/vehicleRoutes'));

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

        // Only send rides if driver has WAITING status and is online
        if (driver && driver.rideStatus === 'WAITING' && driver.isOnline === true) {
          const Ride = require('./models/Ride');
          const Vehicle = require('./DriverModel/VehicleModel');
          const availableRides = await Ride.find({ status: 'BOOKED' }).sort({ createdAt: -1 });

          if (availableRides.length > 0) {
            for (const ride of availableRides) {
              const selectedCategoryId = ride.rideInfo.selectedCategoryId;
              const categoryId = ride.rideInfo.categoryId;
              const subcategoryId = ride.rideInfo.subcategoryId;
              const categoryName = ride.rideInfo.categoryName;
              const categoryNameLower = categoryName.toLowerCase();

              let driverMatches = false;
              const categoryMatches = driver.personalInformation?.category === categoryId;
              const subcategoryMatches = driver.personalInformation?.subCategory?.includes(subcategoryId);

              // Check driver eligibility based on category
              if (categoryNameLower === 'driver') {
                driverMatches = driver.driverCategory?.toString() === selectedCategoryId?.toString();
              } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
                const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';
                
                const vehicles = await Vehicle.find({
                  [vehicleField]: selectedCategoryId,
                  status: true,
                  assignedTo: driverId
                });
                
                driverMatches = vehicles.length > 0;
              }

              if (driverMatches && categoryMatches && subcategoryMatches) {
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
              }
            }
            console.log(`📤 Sent filtered available rides to new driver ${driverId} (WAITING status + matching categories)`);
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

const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCYJrI4qi8sgD5DsKn9lVlUtQtKr_y13t4';

app.get('/api/google-maps-script', (req, res) => {


  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const script = `
    (function() {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
});

// Add these routes to your server.js along with the existing google-maps-script route

app.get('/api/places/autocomplete', async (req, res) => {
  const { input, sessiontoken } = req.query;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:IN&key=${apiKey}&sessiontoken=${sessiontoken}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

app.get('/api/places/details', async (req, res) => {
  const { place_id, sessiontoken } = req.query;


  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=formatted_address,geometry,address_components&key=${apiKey}&sessiontoken=${sessiontoken}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

// Make onlineDrivers accessible globally
app.set('onlineDrivers', onlineDrivers);

module.exports = app;