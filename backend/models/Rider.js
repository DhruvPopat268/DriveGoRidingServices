const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""], // add "" as allowed value
      default: ""
    },

    email: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);