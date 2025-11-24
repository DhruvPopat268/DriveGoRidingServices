const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const ParcelRideCost = require("../models/ParcelRideCost");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

async function getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId) {
  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;
    
    const parts = usageStr.split('&').map(part => part.trim());
    
    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hrs?/i);
      const minMatch = part.match(/(\d+)\s*min/i);
      
      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });
    
    return usage;
  };

  const parsedUsage = parseUsage(selectedUsage);
  
  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, subSubCategory: subSubcategoryId, priceCategory: selectedCategoryId };
  
  // Add both km and minutes to query if they exist
  if (parsedUsage.km > 0) {
    rideCostQuery.includedKm = parsedUsage.km.toString();
  }
  if (parsedUsage.minutes > 0) {
    rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
  }
  const records = await DriverRideCost.find(
    rideCostQuery
  ).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst");
  // console.log(records)
  const includedKm = [...new Set(records.map(r => r.includedKm))];
  const includedMinutes = [...new Set(records.map(r => r.includedMinutes))];
  const extraChargePerKm = records[0]?.extraChargePerKm || 0;
  const extraChargePerMinute = records[0]?.extraChargePerMinute || 0;
  const extraChargesFromAdmin = records[0]?.extraChargesFromAdmin || 0;
  const gst = records[0]?.gst || 0;
  return { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst };
}

async function getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId) {

  // console.log(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId)

  const subCategory = await SubCategory.findById(subcategoryId).select("name");
  if (!subCategory) throw new Error("Subcategory not found");

  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;
    
    const parts = usageStr.split('&').map(part => part.trim());
    
    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hrs?/i);
      const minMatch = part.match(/(\d+)\s*min/i);
      
      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });
    
    return usage;
  };

  const parsedUsage = parseUsage(selectedUsage);

  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, subSubCategory: subSubcategoryId, priceCategory: selectedCategoryId };

  // Add both km and minutes to query if they exist
  if (parsedUsage.km > 0) {
    rideCostQuery.includedKm = parsedUsage.km.toString();
  }
  if (parsedUsage.minutes > 0) {
    rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
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

  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;
    
    const parts = usageStr.split('&').map(part => part.trim());
    
    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hrs?/i);
      const minMatch = part.match(/(\d+)\s*min/i);
      
      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });
    
    return usage;
  };

  const parsedUsage = parseUsage(selectedUsage);
  const categoryName = category.name.toLowerCase();

  if (categoryName === "parcel") {
    let rideCostQuery = { category: categoryId, subcategory: subcategoryId, priceCategory: selectedCategoryId };
    
    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
      rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
      rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    }

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
