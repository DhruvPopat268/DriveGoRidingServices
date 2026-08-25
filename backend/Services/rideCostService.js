const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const ParcelRideCost = require("../models/ParcelRideCost");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

async function getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId) {
  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km", "2 Hours")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;

    const parts = usageStr.split('&').map(part => part.trim());

    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hours?/i);
      const minMatch = part.match(/(\d+)\s*min/i);

      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });

    return usage;
  };

  console.log('\n========== getDriverRideIncludedData CALLED ==========');
  console.log('📍 [DRIVER] Input parameters:', {
    categoryId,
    subcategoryId,
    subSubcategoryId,
    selectedUsage,
    selectedCategoryId
  });

  const parsedUsage = parseUsage(selectedUsage);
  console.log('📍 [DRIVER] Parsed usage from "' + selectedUsage + '":', parsedUsage);

  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, priceCategory: selectedCategoryId };

  // Only add subSubCategory if it's not undefined
  if (subSubcategoryId) {
    rideCostQuery.subSubCategory = subSubcategoryId;
    console.log('📍 [DRIVER] Added subSubCategory to query:', subSubcategoryId);
  } else {
    console.log('⚠️ [DRIVER] subSubcategoryId is undefined - NOT added to query');
  }

  // Add both km and minutes to query if they exist
  if (parsedUsage.km > 0) {
    rideCostQuery.includedKm = parsedUsage.km.toString();
    console.log('📍 [DRIVER] Added includedKm to query:', rideCostQuery.includedKm);
  }
  if (parsedUsage.minutes > 0) {
    rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    console.log('📍 [DRIVER] Added includedMinutes to query:', rideCostQuery.includedMinutes);
  }

  console.log('📍 [DRIVER] Final database query:', rideCostQuery);

  const records = await DriverRideCost.find(
    rideCostQuery
  ).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst cancellationBufferTime");

  console.log('📍 [DRIVER] Records found from DB:', records.length);
  if (records.length > 0) {
    console.log('📍 [DRIVER] Raw records:', records);
  }

  // Validate that we got exactly one record
  if (records.length === 0) {
    console.log('❌ [DRIVER] ERROR - No records found!');
    throw new Error(`No pricing configuration found for Driver - Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
  }

  if (records.length > 1) {
    console.log('❌ [DRIVER] ERROR - Multiple records found! Expected 1, got', records.length);
    throw new Error(`Multiple pricing configurations found for Driver (expected 1, got ${records.length}). This indicates a data integrity issue. Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
  }

  const record = records[0];
  const includedKm = record.includedKm;
  const includedMinutes = record.includedMinutes;
  const extraChargePerKm = record.extraChargePerKm || 0;
  const extraChargePerMinute = record.extraChargePerMinute || 0;
  const extraChargesFromAdmin = record.extraChargesFromAdmin || 0;
  const gst = record.gst || 0;
  const cancellationBufferTime = record.cancellationBufferTime || 0;

  const result = { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst , cancellationBufferTime };
  console.log('✅ [DRIVER] Final result to return:', result);
  console.log('========== END getDriverRideIncludedData ==========\n');

  return result;
}

async function getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId) {

  // console.log(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId)

  const subCategory = await SubCategory.findById(subcategoryId).select("name");
  if (!subCategory) throw new Error("Subcategory not found");

  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km", "2 Hours")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;

    const parts = usageStr.split('&').map(part => part.trim());

    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hours?/i);
      const minMatch = part.match(/(\d+)\s*min/i);

      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });

    return usage;
  };

  console.log('\n========== getCabRideIncludedData CALLED ==========');
  console.log('📍 [CAB] Input parameters:', {
    categoryId,
    subcategoryId,
    subSubcategoryId,
    selectedUsage,
    selectedCategoryId
  });

  const parsedUsage = parseUsage(selectedUsage);
  console.log('📍 [CAB] Parsed usage from "' + selectedUsage + '":', parsedUsage);

  let rideCostQuery = { category: categoryId, subcategory: subcategoryId, car: selectedCategoryId };

  // Only add subSubCategory if it's not undefined
  if (subSubcategoryId) {
    rideCostQuery.subSubCategory = subSubcategoryId;
    console.log('📍 [CAB] Added subSubCategory to query:', subSubcategoryId);
  } else {
    console.log('⚠️ [CAB] subSubcategoryId is undefined - NOT added to query');
  }

  // Add both km and minutes to query if they exist
  if (parsedUsage.km > 0) {
    rideCostQuery.includedKm = parsedUsage.km.toString();
    console.log('📍 [CAB] Added includedKm to query:', rideCostQuery.includedKm);
  }
  if (parsedUsage.minutes > 0) {
    rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    console.log('📍 [CAB] Added includedMinutes to query:', rideCostQuery.includedMinutes);
  }

  console.log('📍 [CAB] Final database query:', rideCostQuery);

  const records = await CabRideCost.find(rideCostQuery).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst cancellationBufferTime");

  console.log('📍 [CAB] Records found from DB:', records.length);
  if (records.length > 0) {
    console.log('📍 [CAB] Raw records:', records);
  }

  // Validate that we got exactly one record
  if (records.length === 0) {
    console.log('❌ [CAB] ERROR - No records found!');
    throw new Error(`No pricing configuration found for Cab - Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
  }

  if (records.length > 1) {
    console.log('❌ [CAB] ERROR - Multiple records found! Expected 1, got', records.length);
    throw new Error(`Multiple pricing configurations found for Cab (expected 1, got ${records.length}). This indicates a data integrity issue. Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
  }

  const record = records[0];
  const includedKm = record.includedKm;
  const includedMinutes = record.includedMinutes;
  const extraChargePerKm = record.extraChargePerKm || 0;
  const extraChargePerMinute = record.extraChargePerMinute || 0;
  const extraChargesFromAdmin = record.extraChargesFromAdmin || 0;
  const gst = record.gst || 0;
  const cancellationBufferTime = record.cancellationBufferTime || 0;

  const result = { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst , cancellationBufferTime };
  console.log('✅ [CAB] Final result to return:', result);
  console.log('========== END getCabRideIncludedData ==========\n');

  return result;
}

async function getParcelRideIncludedData(categoryId, subcategoryId, selectedUsage, selectedCategoryId) {
  const category = await Category.findById(categoryId).select("name");
  if (!category) throw new Error("Category not found");

  // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km", "2 Hours")
  const parseUsage = (usageStr) => {
    const usage = { km: 0, minutes: 0 };
    if (!usageStr) return usage;

    const parts = usageStr.split('&').map(part => part.trim());

    parts.forEach(part => {
      const kmMatch = part.match(/(\d+)\s*km/i);
      const hrMatch = part.match(/(\d+)\s*hours?/i);
      const minMatch = part.match(/(\d+)\s*min/i);

      if (kmMatch) usage.km = parseInt(kmMatch[1]);
      if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) usage.minutes += parseInt(minMatch[1]);
    });

    return usage;
  };

  console.log('\n========== getParcelRideIncludedData CALLED ==========');
  console.log('📍 [PARCEL] Input parameters:', {
    categoryId,
    subcategoryId,
    selectedUsage,
    selectedCategoryId
  });

  const parsedUsage = parseUsage(selectedUsage);
  console.log('📍 [PARCEL] Parsed usage from "' + selectedUsage + '":', parsedUsage);

  const categoryName = category.name.toLowerCase();
  console.log('📍 [PARCEL] Category name from DB:', categoryName);

  if (categoryName === "parcel") {
    let rideCostQuery = { category: categoryId, subcategory: subcategoryId, parcelVehicle: selectedCategoryId };

    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
      rideCostQuery.includedKm = parsedUsage.km.toString();
      console.log('📍 [PARCEL] Added includedKm to query:', rideCostQuery.includedKm);
    }
    if (parsedUsage.minutes > 0) {
      rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
      console.log('📍 [PARCEL] Added includedMinutes to query:', rideCostQuery.includedMinutes);
    }

    console.log('📍 [PARCEL] Final database query:', rideCostQuery);

    const records = await ParcelRideCost.find(rideCostQuery).select("includedKm includedMinutes extraChargePerKm extraChargePerMinute extraChargesFromAdmin gst cancellationBufferTime");

    console.log('📍 [PARCEL] Records found from DB:', records.length);
    if (records.length > 0) {
      console.log('📍 [PARCEL] Raw records:', records);
    }

    // Validate that we got exactly one record
    if (records.length === 0) {
      console.log('❌ [PARCEL] ERROR - No records found!');
      throw new Error(`No pricing configuration found for Parcel - Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
    }

    if (records.length > 1) {
      console.log('❌ [PARCEL] ERROR - Multiple records found! Expected 1, got', records.length);
      throw new Error(`Multiple pricing configurations found for Parcel (expected 1, got ${records.length}). This indicates a data integrity issue. Category: ${categoryId}, Subcategory: ${subcategoryId}, Usage: ${selectedUsage}`);
    }

    const record = records[0];
    const includedKm = record.includedKm;
    const includedMinutes = record.includedMinutes;
    const extraChargePerKm = record.extraChargePerKm || 0;
    const extraChargePerMinute = record.extraChargePerMinute || 0;
    const extraChargesFromAdmin = record.extraChargesFromAdmin || 0;
    const gst = record.gst || 0;
    const cancellationBufferTime = record.cancellationBufferTime || 0;

    const result = { includedKm, includedMinutes, extraChargePerKm, extraChargePerMinute, extraChargesFromAdmin, gst , cancellationBufferTime };
    console.log('✅ [PARCEL] Final result to return:', result);
    console.log('========== END getParcelRideIncludedData ==========\n');

    return result;
  }

  console.log('❌ [PARCEL] ERROR - Category name mismatch! Expected "parcel", got:', categoryName);
  console.log('========== END getParcelRideIncludedData (categoryName mismatch) ==========\n');
  return {};
}

module.exports = {
  getDriverRideIncludedData,
  getCabRideIncludedData,
  getParcelRideIncludedData
};
