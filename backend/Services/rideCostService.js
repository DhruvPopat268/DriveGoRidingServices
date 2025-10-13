const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const ParcelRideCost = require("../models/ParcelRideCost");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

/**
 * Get includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst from DriverRideCost
 */
async function getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId , selectedUsage , subcategoryName) {
  const records = await DriverRideCost.find({
    category: categoryId,
    subcategory: subcategoryId,
    subSubCategory: subSubcategoryId
  }).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");

  const includedKm = [...new Set(records.map(r => r.includedKm))];
  const includedMinutes = [...new Set(records.map(r => r.includedMinutes))];

  const extraChargePerKm = records[0]?.extraChargePerKm || 0;
  const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
  const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
  const gst = records[0]?.gst || 0;

  return { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
}

/**
 * Get includedKm or includedMinutes + extra charges from CabRideCost based on subcategory name
 */
async function getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId) {
  const subCategory = await SubCategory.findById(subcategoryId).select("name");
  if (!subCategory) throw new Error("Subcategory not found");

  const subCategoryName = subCategory.name.toLowerCase();
  const records = await CabRideCost.find({
    category: categoryId,
    subcategory: subcategoryId,
    subSubCategory: subSubcategoryId
  }).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");

  const extraChargePerKm = records[0]?.extraChargePerKm || 0;
  const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
  const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
  const gst = records[0]?.gst || 0;

  if (subCategoryName === "oneway") {
    const includedKm = [...new Set(records.map(r => r.includedKm))];
    return { includedKm, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
  } else {
    const includedMinutes = [...new Set(records.map(r => r.includedMinutes))];
    return { includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
  }
}

/**
 * Get includedKm + extra charges for ParcelRideCost based on category name
 */
async function getParcelRideIncludedData(categoryId, subcategoryId) {
  const category = await Category.findById(categoryId).select("name");
  if (!category) throw new Error("Category not found");

  const categoryName = category.name.toLowerCase();
  if (categoryName === "parcel") {
    const records = await ParcelRideCost.find({
      category: categoryId,
      subcategory: subcategoryId
    }).select("includedKm extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");

    const includedKm = [...new Set(records.map(r => r.includedKm))];
    const extraChargePerKm = records[0]?.extraChargePerKm || 0;
    const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
    const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
    const gst = records[0]?.gst || 0;

    return { includedKm, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
  }

  return {};
}

module.exports = {
  getDriverRideIncludedData,
  getCabRideIncludedData,
  getParcelRideIncludedData
};
