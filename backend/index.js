
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const vehicleCategories = require('./routes/vehicleCategory')
const priceCategoryRoutes = require('./routes/priceCategoryRoutes');
const rideCostRoutes = require('./routes/rideCostRoutes');
const peakRoutes = require('./routes/peakRoutes');
const instructionRoutes = require('./routes/instructionRoutes');

const riderAuthRoutes = require('./routes/riderAuth_otp_Routes');
const connectToDb = require('./database/db');
const cookieParser = require("cookie-parser");
const rideRoutes = require("./routes/rideRoutes");



const app = express();

// Middleware
app.use(cors({
  origin: [
    "https://drivegoweb.vercel.app/",
    "https://drivegoweb.vercel.app",
    "https://drivego-admin.vercel.app/",
    "https://drivego-admin.vercel.app",
    "http://10.239.197.228:8080",
    "http://localhost:8082",
    "http://localhost:8081",
    "http://localhost:8080",
   "https://driver-go-admin-frontend.onrender.com",
   "https://drive-go-frontend.onrender.com"
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
app.use('/api/vehiclecategories',vehicleCategories)
app.use('/api/price-categories', priceCategoryRoutes);
app.use('/api/ride-costs', rideCostRoutes);
app.use('/api/peaks', peakRoutes);
app.use('/api/instructions', instructionRoutes);

// Rider routes
app.use("/api/rider-auth", riderAuthRoutes);

app.use("/api/rides", rideRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
