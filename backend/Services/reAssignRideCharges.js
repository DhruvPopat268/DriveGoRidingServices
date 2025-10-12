import moment from "moment";
import mongoose from "mongoose";
import Rider from "../models/Rider.js";
import Category from "../models/Category.js";
import SubCategory from "../models/SubCategory.js";
import SubSubCategory from "../models/SubSubCategory.js";
import DriverRideCost from "../models/DriverRideCost.js";
import CabRideCost from "../models/CabRideCost.js";
import peakHours from "../models/PeakHours.js";
import pricecategories from "../models/PriceCategories.js";

// 🧮 1️⃣ Function for Rider-based Calculation
export const calculateDriverRideCharges = async ({
  riderId,
  categoryId,
  selectedDate,
  selectedTime,
  includeInsurance,
  selectedUsage,
  subcategoryId,
  subSubcategoryId,
  durationType,
  durationValue,
}) => {
  const rider = await Rider.findById(riderId);
  if (!rider) throw new Error("Rider not found");

  const category = await Category.findById(categoryId);
  if (!category) throw new Error("Category not found");

  const subcategory = await SubCategory.findById(subcategoryId);
  if (!subcategory) throw new Error("Subcategory not found");

  const subSubCategory = subSubcategoryId
    ? await SubSubCategory.findById(subSubcategoryId)
    : null;
  if (subSubcategoryId && !subSubCategory)
    throw new Error("Sub-Subcategory not found");

  // usage conversion
  let usageValue = parseFloat(selectedUsage) || 0;
  const formattedSubcategory = subcategory.name.toLowerCase();
  const formattedSubSubCategory = subSubCategory
    ? subSubCategory.name.toLowerCase()
    : null;

  if (
    formattedSubcategory === "hourly" ||
    formattedSubSubCategory === "roundtrip" ||
    formattedSubcategory === "monthly" ||
    formattedSubcategory === "weekly"
  ) {
    usageValue = usageValue * 60; // hours → minutes
  }

  // query ride costs
  let rideCostQuery = {
    category: categoryId,
    subcategory: subcategoryId,
    subSubCategory: subSubcategoryId,
  };

  if (
    formattedSubcategory === "hourly" ||
    formattedSubSubCategory === "roundtrip" ||
    formattedSubcategory === "monthly" ||
    formattedSubcategory === "weekly"
  ) {
    rideCostQuery.includedMinutes = usageValue.toString();
  } else {
    rideCostQuery.includedKm = usageValue.toString();
  }

  const rideCostModels = await DriverRideCost.find(rideCostQuery);
  if (rideCostModels.length === 0)
    throw new Error("No ride cost models found");

  // peak hour logic
  const peakChargesList = await peakHours.find({});
  const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, "YYYY-MM-DD HH:mm");
  let peakCharges = 0;

  for (const peak of peakChargesList) {
    if (peak.type === "peak_dates") {
      const startDateTime = moment(`${peak.startDate} ${peak.startTime}`, "YYYY-MM-DD HH:mm");
      const endDateTime = moment(`${peak.endDate} ${peak.endTime}`, "YYYY-MM-DD HH:mm");
      if (bookingDateTime.isBetween(startDateTime, endDateTime, null, "[]")) {
        peakCharges += peak.price;
      }
    } else if (peak.type === "peak_hours") {
      const startTime = moment(`${selectedDate} ${peak.startTime}`, "YYYY-MM-DD HH:mm");
      const endTime = moment(`${selectedDate} ${peak.endTime}`, "YYYY-MM-DD HH:mm");
      if (bookingDateTime.isBetween(startTime, endTime, null, "[]")) {
        peakCharges += peak.price;
      }
    }
  }

  const hour = bookingDateTime.hour();
  const isNight = hour >= 22 || hour < 6;

  const result = [];

  for (const model of rideCostModels) {
    const priceCategory = await pricecategories.findById(model.priceCategory);
    let driverCharges = model.baseFare || 0;

    // apply duration logic
    if (durationType && durationValue) {
      switch (durationType.toLowerCase()) {
        case "day":
          driverCharges = model.baseFare * durationValue;
          break;
        case "week":
          driverCharges = model.baseFare * durationValue * 7;
          break;
        case "month":
          driverCharges = model.baseFare * durationValue * 30;
          break;
        default:
          driverCharges = model.baseFare;
      }
    }

    const modelPickCharges = model.pickCharges || 0;
    const modelNightCharges = isNight ? model.nightCharges || 0 : 0;
    const modelInsurance = includeInsurance ? model.insurance || 0 : 0;

    const baseTotal = driverCharges + modelPickCharges + peakCharges + modelNightCharges;
    const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
    const adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));

    const subtotal = baseTotal + adminCommission;
    const gstCharges = Math.ceil((subtotal * (model.gst || 0)) / 100);
    const cancellationCharges = rider.cancellationCharges || 0;
    const totalPayable = Math.round(
      baseTotal + adjustedAdminCommission + gstCharges + modelInsurance + cancellationCharges
    );

    result.push({
      category: priceCategory?.priceCategoryName || "Unknown",
      driverCharges: Math.round(driverCharges),
      pickCharges: Math.round(modelPickCharges),
      peakCharges: Math.round(peakCharges),
      insuranceCharges: Math.round(modelInsurance),
      nightCharges: Math.round(modelNightCharges),
      adminCommissionOriginal: adminCommission,
      adminCommissionAdjusted: adjustedAdminCommission,
      discountApplied: model.discount || 0,
      gstCharges,
      subtotal: Math.round(subtotal),
      totalPayable,
      cancellationCharges,
    });
  }

  return result;
};

// 🚗 2️⃣ Function for Cab-based Calculation
export const calculateCabRideCharges = async ({
  carCategoryId,
  categoryId,
  selectedDate,
  selectedTime,
  includeInsurance,
  selectedUsage,
  subcategoryId,
  subSubcategoryId,
  durationType,
  durationValue,
}) => {
  if (!carCategoryId) throw new Error("carCategoryId is required");

  const category = await Category.findById(categoryId);
  if (!category) throw new Error("Category not found");

  const subcategory = await SubCategory.findById(subcategoryId);
  if (!subcategory) throw new Error("Subcategory not found");

  const subSubCategory = subSubcategoryId
    ? await SubSubCategory.findById(subSubcategoryId)
    : null;
  if (subSubcategoryId && !subSubCategory)
    throw new Error("Sub-Subcategory not found");

  let usageValue = parseFloat(selectedUsage) || 0;
  const formattedSubcategory = subcategory.name.toLowerCase();
  const formattedSubSubCategory = subSubCategory
    ? subSubCategory.name.toLowerCase()
    : null;

  if (
    formattedSubcategory === "hourly" ||
    formattedSubSubCategory === "roundtrip" ||
    formattedSubcategory === "monthly" ||
    formattedSubcategory === "weekly"
  ) {
    usageValue = usageValue * 60;
  }

  let rideCostQuery = {
    priceCategory: new mongoose.Types.ObjectId(carCategoryId),
    category: new mongoose.Types.ObjectId(categoryId),
    subcategory: new mongoose.Types.ObjectId(subcategoryId),
  };

  if (subSubcategoryId) {
    rideCostQuery.subSubCategory = new mongoose.Types.ObjectId(subSubcategoryId);
  }

  if (
    formattedSubcategory === "hourly" ||
    formattedSubSubCategory === "roundtrip" ||
    formattedSubcategory === "monthly" ||
    formattedSubcategory === "weekly"
  ) {
    rideCostQuery.includedMinutes = usageValue.toString();
  } else {
    rideCostQuery.includedKm = usageValue.toString();
  }

  const rideCostModels = await CabRideCost.find(rideCostQuery)
    .populate("category", "name")
    .populate("car", "name");

  if (rideCostModels.length === 0)
    throw new Error("No ride cost models found for this car category");

  const peakChargesList = await peakHours.find({});
  const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, "YYYY-MM-DD HH:mm");

  let peakCharges = 0;
  for (const peak of peakChargesList) {
    if (peak.type === "peak_dates") {
      const startDateTime = moment(`${peak.startDate} ${peak.startTime}`, "YYYY-MM-DD HH:mm");
      const endDateTime = moment(`${peak.endDate} ${peak.endTime}`, "YYYY-MM-DD HH:mm");
      if (bookingDateTime.isBetween(startDateTime, endDateTime, null, "[]")) {
        peakCharges += peak.price;
      }
    } else if (peak.type === "peak_hours") {
      const startTime = moment(`${selectedDate} ${peak.startTime}`, "YYYY-MM-DD HH:mm");
      const endTime = moment(`${selectedDate} ${peak.endTime}`, "YYYY-MM-DD HH:mm");
      if (bookingDateTime.isBetween(startTime, endTime, null, "[]")) {
        peakCharges += peak.price;
      }
    }
  }

  const hour = bookingDateTime.hour();
  const isNight = hour >= 22 || hour < 6;

  const result = [];
  for (const model of rideCostModels) {
    const priceCategory = await pricecategories.findById(model.priceCategory);

    let driverCharges = model.baseFare || 0;

    if (durationType && durationValue) {
      switch (durationType.toLowerCase()) {
        case "day":
          driverCharges = model.baseFare * durationValue;
          break;
        case "week":
          driverCharges = model.baseFare * durationValue * 7;
          break;
        case "month":
          driverCharges = model.baseFare * durationValue * 30;
          break;
        default:
          driverCharges = model.baseFare;
      }
    }

    const modelPickCharges = model.pickCharges || 0;
    const modelNightCharges = isNight ? model.nightCharges || 0 : 0;
    const modelInsurance = includeInsurance ? model.insurance || 0 : 0;

    const baseTotal = driverCharges + modelPickCharges + peakCharges + modelNightCharges;
    const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
    const adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));

    const subtotal = baseTotal + adminCommission;
    const gstCharges = Math.ceil((subtotal * (model.gst || 0)) / 100);
    const totalPayable = Math.round(baseTotal + adjustedAdminCommission + gstCharges + modelInsurance);

    result.push({
      category: model.car?.name,
      driverCharges: Math.round(driverCharges),
      pickCharges: Math.round(modelPickCharges),
      peakCharges: Math.round(peakCharges),
      insuranceCharges: Math.round(modelInsurance),
      nightCharges: Math.round(modelNightCharges),
      adminCommissionOriginal: adminCommission,
      adminCommissionAdjusted: adjustedAdminCommission,
      discountApplied: model.discount || 0,
      gstCharges,
      subtotal: Math.round(subtotal),
      totalPayable,
    });
  }

  return result;
};