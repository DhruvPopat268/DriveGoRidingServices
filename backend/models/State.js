const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'State name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'State name must be at least 2 characters long'],
      maxlength: [50, 'State name cannot exceed 50 characters'],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const State = mongoose.model('State', stateSchema);
module.exports = State;