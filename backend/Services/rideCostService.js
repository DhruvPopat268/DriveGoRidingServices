const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const ParcelRideCost = require("../models/ParcelRideCost");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

async function getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId) {
  let usageValue = parseFloat(selectedUsage) || 0;
  if (subcategoryNameLower === 'oneway' || subcategoryNameLower === 'one way' || subcategoryNameLower === 'one-way') {
  }
  else {
    usageValue = usageValue * 60;
  }
  console.log('usageValue', usageValue)
  console.log(selectedCategoryId)
  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, subSubCategory: subSubcategoryId, priceCategory: selectedCategoryId };
  if (
    subcategoryNameLower === 'oneway' || subcategoryNameLower === 'one way' || subcategoryNameLower === 'one-way'
  ) {
    rideCostQuery.includedKm = usageValue.toString();
  } else {
    rideCostQuery.includedMinutes = usageValue.toString();
  }
  const records = await DriverRideCost.find(
    rideCostQuery
  ).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");
  console.log(records)
  const includedKm = [...new Set(records.map(r => r.includedKm))];
  const includedMinutes = [...new Set(records.map(r => r.includedMinutes))];
  const extraChargePerKm = records[0]?.extraChargePerKm || 0;
  const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
  const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
  const gst = records[0]?.gst || 0;
  return { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
}

async function getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId) {

  console.log(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId)

  const subCategory = await SubCategory.findById(subcategoryId).select("name");
  if (!subCategory) throw new Error("Subcategory not found");

  let usageValue = parseFloat(selectedUsage) || 0;
  const subCategoryName = subCategory.name.toLowerCase();

  if (subCategoryName !== 'oneway' && subCategoryName !== 'one way' && subCategoryName !== 'one-way') {
    usageValue = usageValue * 60;
  }

  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, subSubCategory: subSubcategoryId, priceCategory: selectedCategoryId };

  if (subCategoryName === 'oneway' || subCategoryName === 'one way' || subCategoryName === 'one-way') {
    rideCostQuery.includedKm = usageValue.toString();
  } else {
    rideCostQuery.includedMinutes = usageValue.toString();
  }

  const records = await CabRideCost.find(rideCostQuery).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");

  const includedKm = [...new Set(records.map(r => r.includedKm))];
  const includedMinutes = [...new Set(records.map(r => r.includedMinutes))];
  const extraChargePerKm = records[0]?.extraChargePerKm || 0;
  const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
  const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
  const gst = records[0]?.gst || 0;

  if (subCategoryName === "oneway" || subCategoryName === "one way" || subCategoryName === "one-way") {
    return { includedKm, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
  } else {
    return { includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
  }
}

async function getParcelRideIncludedData(categoryId, subcategoryId, selectedUsage, selectedCategoryId) {
  const category = await Category.findById(categoryId).select("name");
  if (!category) throw new Error("Category not found");

  let usageValue = parseFloat(selectedUsage) || 0;
  const categoryName = category.name.toLowerCase();

  if (categoryName === "parcel") {
    let rideCostQuery = { category: categoryId, subcategory: subcategoryId, priceCategory: selectedCategoryId };
    rideCostQuery.includedKm = usageValue.toString();

    const records = await ParcelRideCost.find(rideCostQuery).select("includedKm extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");

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
