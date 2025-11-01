const mongoose = require('mongoose');

const instructionSchema = new mongoose.Schema({
  categoryId: {type: mongoose.Schema.Types.ObjectId,ref: 'Category',required: true},
  categoryName: {type: String,required: true},
  subCategoryId: {type: mongoose.Schema.Types.ObjectId,ref: 'SubCategory',required: true},
  subCategoryName: {type: String,required: true},
  subSubCategoryId: {type: mongoose.Schema.Types.ObjectId},
  subSubCategoryName: {type: String},
  driverCategoryId: {type: mongoose.Schema.Types.ObjectId},
  driverCategoryName: {type: String},
  // Cab fields
  carCategoryId: {type: mongoose.Schema.Types.ObjectId},
  carCategoryName: {type: String},
  carId: {type: mongoose.Schema.Types.ObjectId},
  carName: {type: String},
  // Parcel fields
  parcelCategoryId: {type: mongoose.Schema.Types.ObjectId},
  parcelCategoryName: {type: String},
  vehicleTypeId: {type: mongoose.Schema.Types.ObjectId},
  vehicleTypeName: {type: String},
  instructions: {type: String,required: true,trim: true}
}, {
  timestamps: true
});

module.exports = mongoose.model('Instruction', instructionSchema);