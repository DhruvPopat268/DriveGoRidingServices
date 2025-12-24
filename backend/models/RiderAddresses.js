const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { timestamps: true, _id: true }
);

const riderAddressesSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
    addresses: [addressSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiderAddresses", riderAddressesSchema);