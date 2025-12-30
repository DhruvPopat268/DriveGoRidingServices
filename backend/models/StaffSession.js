const mongoose = require("mongoose");

// helper: always return IST timestamp
function getISTDate() {
  const date = new Date();
  // convert to IST by adding 5h30m
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
}

const staffSessionSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true },
  token: { type: String, required: true },

  // will store IST timestamp, but no auto-expiry
  createdAt: { 
    type: Date, 
    default: getISTDate
  }
});

module.exports = mongoose.model("StaffSession", staffSessionSchema);