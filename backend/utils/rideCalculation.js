const DriverRideCost = require('../models/DriverRideCost');
const CabRideCost = require('../models/CabRideCost');
const ParcelRideCost = require('../models/ParcelRideCost');
const peakHours = require('../models/Peak');
const pricecategories = require('../models/PriceCategory');
const moment = require('moment');

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
  
  if (usage.km === 0 && usage.minutes === 0) {
    throw new Error('Invalid selectedUsage format. Expected format: "8km & 80min" or "10km" or "2hrs"');
  }
  
  return usage;
};

const calculatePeakCharges = async (selectedDate, selectedTime) => {
  const peakChargesList = await peakHours.find({});
  const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm');

  let peakCharges = 0;
  for (const peak of peakChargesList) {
    if (peak.type === 'peak_dates') {
      const startDateTime = moment(`${peak.startDate} ${peak.startTime}`, 'YYYY-MM-DD HH:mm');
      const endDateTime = moment(`${peak.endDate} ${peak.endTime}`, 'YYYY-MM-DD HH:mm');
      if (bookingDateTime.isBetween(startDateTime, endDateTime, null, '[]')) {
        peakCharges += peak.price;
      }
    } else if (peak.type === 'peak_hours') {
      const startTime = moment(`${selectedDate} ${peak.startTime}`, 'YYYY-MM-DD HH:mm');
      const endTime = moment(`${selectedDate} ${peak.endTime}`, 'YYYY-MM-DD HH:mm');
      if (bookingDateTime.isBetween(startTime, endTime, null, '[]')) {
        peakCharges += peak.price;
      }
    }
  }
  return peakCharges;
};

const calculateDriverRideCost = async (params) => {
  const {
    categoryName,
    categoryId,
    subcategoryId,
    subSubcategoryId,
    selectedDate,
    selectedTime,
    includeInsurance,
    selectedUsage,
    durationType,
    durationValue,
    riderId,
    selectedCategoryId,
    isReferralEarningUsed,
    referralEarningUsedAmount,
    rider
  } = params;

  console.log(params)

  const parsedUsage = parseUsage(selectedUsage);

  let rideCostQuery = { 
    category: categoryId, 
    subcategory: subcategoryId,
    includedKm: parsedUsage.km.toString(),
    includedMinutes: parsedUsage.minutes.toString(),
    priceCategory: selectedCategoryId
  };
  if (subSubcategoryId) rideCostQuery.subSubCategory = subSubcategoryId;



  const rideCostModels = await DriverRideCost.find(rideCostQuery);
  //console.log('ride cost models', rideCostModels);
  if (rideCostModels.length === 0) throw new Error('No ride cost models found');

  const model = rideCostModels.find(m => m.priceCategory.toString() === selectedCategoryId);
  if (!model) throw new Error('Selected price category not found');

  const peakCharges = await calculatePeakCharges(selectedDate, selectedTime);
  const hour = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm').hour();
  const isNight = hour >= 22 || hour < 6;

  let driverCharges = model.baseFare || 0;
  if (durationType && durationValue) {
    const multiplier = durationType.toLowerCase() === 'day' ? durationValue : 
                      durationType.toLowerCase() === 'week' ? durationValue * 7 : 
                      durationType.toLowerCase() === 'month' ? durationValue * 30 : 1;
    driverCharges = model.baseFare * multiplier;
  }

  const pickCharges = model.pickCharges || 0;
  const nightCharges = isNight ? model.nightCharges || 0 : 0;
  const insuranceCharges = includeInsurance ? model.insurance || 0 : 0;
  const baseTotal = driverCharges + pickCharges + peakCharges + nightCharges;
  const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
  let adminCharges = Math.max(0, adminCommission - (model.discount || 0));
  let referralCommissionUsed = 0;

  //console.log('is reff used' , isReferralEarningUsed , 'reff earning used amount' ,referralCommissionUsed, 'rider' , rider )
  
  if (isReferralEarningUsed && referralEarningUsedAmount > 0 && rider) {
    const riderReferralBalance = rider.referralEarning?.currentBalance || 0;
    console.log('riderReferralBalance', riderReferralBalance, 'referralEarningUsedAmount', referralEarningUsedAmount)
    if (riderReferralBalance >= referralEarningUsedAmount) {
      const deductionAmount = Math.min(adminCharges, referralEarningUsedAmount);
      adminCharges = Math.max(0, adminCharges - referralEarningUsedAmount);
      referralCommissionUsed = deductionAmount;
    }
  }
  
  const subtotal = baseTotal + adminCommission;
  const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);

  //console.log('admin charges', adminCharges , 'reff used' , referralCommissionUsed)

  return {
    driverCharges: Math.round(driverCharges),
    pickCharges: Math.round(pickCharges),
    peakCharges: Math.round(peakCharges),
    nightCharges: Math.round(nightCharges),
    insuranceCharges: Math.round(insuranceCharges),
    cancellationCharges: 0,
    discount: model.discount || 0,
    gstCharges,
    subtotal: Math.round(subtotal),
    adminCharges,
    ...(isReferralEarningUsed && { referralCommissionUsed })
  };

  
};

const calculateCabRideCost = async (params) => {
  const {
    categoryName,
    categoryId,
    subcategoryId,
    subSubcategoryId,
    selectedDate,
    selectedTime,
    includeInsurance,
    selectedUsage,
    durationType,
    durationValue,
    carCategoryId,
    selectedCategoryId,
    isReferralEarningUsed,
    referralEarningUsedAmount,
    rider
  } = params;

  const parsedUsage = parseUsage(selectedUsage);

  let rideCostQuery = {
    priceCategory: carCategoryId,
    category: categoryId,
    subcategory: subcategoryId,
    includedKm: parsedUsage.km.toString(),
    includedMinutes: parsedUsage.minutes.toString(),
    car: selectedCategoryId
  };
  if (subSubcategoryId) rideCostQuery.subSubCategory = subSubcategoryId;

  const rideCostModels = await CabRideCost.find(rideCostQuery);
  if (rideCostModels.length === 0) throw new Error('No ride cost models found');

  const model = rideCostModels.find(m => m.car.toString() === selectedCategoryId);
  if (!model) throw new Error('Selected car not found');

  const peakCharges = await calculatePeakCharges(selectedDate, selectedTime);
  const hour = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm').hour();
  const isNight = hour >= 22 || hour < 6;

  let driverCharges = model.baseFare || 0;
  if (durationType && durationValue) {
    const multiplier = durationType.toLowerCase() === 'day' ? durationValue : 
                      durationType.toLowerCase() === 'week' ? durationValue * 7 : 
                      durationType.toLowerCase() === 'month' ? durationValue * 30 : 1;
    driverCharges = model.baseFare * multiplier;
  }

  const pickCharges = model.pickCharges || 0;
  const nightCharges = isNight ? model.nightCharges || 0 : 0;
  const insuranceCharges = includeInsurance ? model.insurance || 0 : 0;
  const baseTotal = driverCharges + pickCharges + peakCharges + nightCharges;
  const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
  let adminCharges = Math.max(0, adminCommission - (model.discount || 0));
  let referralCommissionUsed = 0;
  
  if (isReferralEarningUsed && referralEarningUsedAmount > 0 && rider) {
    const riderReferralBalance = rider.referralEarning?.currentBalance || 0;
    if (riderReferralBalance >= referralEarningUsedAmount) {
      const deductionAmount = Math.min(adminCharges, referralEarningUsedAmount);
      adminCharges = Math.max(0, adminCharges - referralEarningUsedAmount);
      referralCommissionUsed = deductionAmount;
    }
  }
  
  const subtotal = baseTotal + adminCommission;
  const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);

  return {
    driverCharges: Math.round(driverCharges),
    pickCharges: Math.round(pickCharges),
    peakCharges: Math.round(peakCharges),
    nightCharges: Math.round(nightCharges),
    insuranceCharges: Math.round(insuranceCharges),
    cancellationCharges: 0,
    discount: model.discount || 0,
    gstCharges,
    subtotal: Math.round(subtotal),
    adminCharges,
    ...(isReferralEarningUsed && { referralCommissionUsed })
  };
};

const calculateParcelRideCost = async (params) => {
  const {
    categoryName,
    categoryId,
    subcategoryId,
    selectedDate,
    selectedTime,
    includeInsurance,
    selectedUsage,
    durationType,
    durationValue,
    parcelCategoryId,
    selectedCategoryId,
    isReferralEarningUsed,
    referralEarningUsedAmount,
    rider
  } = params;

  const parsedUsage = parseUsage(selectedUsage);

  let rideCostQuery = {
    parcelCategory: parcelCategoryId,
    category: categoryId,
    subcategory: subcategoryId,
    includedKm: parsedUsage.km.toString(),
    includedMinutes: parsedUsage.minutes.toString(),
    parcelVehicle: selectedCategoryId
  };

  const rideCostModels = await ParcelRideCost.find(rideCostQuery);
  if (rideCostModels.length === 0) throw new Error('No ride cost models found');

  const model = rideCostModels.find(m => m.parcelVehicle.toString() === selectedCategoryId);
  if (!model) throw new Error('Selected parcel vehicle not found');

  const peakCharges = await calculatePeakCharges(selectedDate, selectedTime);
  const hour = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm').hour();
  const isNight = hour >= 22 || hour < 6;

  let driverCharges = model.baseFare || 0;
  if (durationType && durationValue) {
    const multiplier = durationType.toLowerCase() === 'day' ? durationValue : 
                      durationType.toLowerCase() === 'week' ? durationValue * 7 : 
                      durationType.toLowerCase() === 'month' ? durationValue * 30 : 1;
    driverCharges = model.baseFare * multiplier;
  }

  const pickCharges = model.pickCharges || 0;
  const nightCharges = isNight ? model.nightCharges || 0 : 0;
  const insuranceCharges = includeInsurance ? model.insurance || 0 : 0;
  const baseTotal = driverCharges + pickCharges + peakCharges + nightCharges;
  const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
  let adminCharges = Math.max(0, adminCommission - (model.discount || 0));
  let referralCommissionUsed = 0;
  
  if (isReferralEarningUsed && referralEarningUsedAmount > 0 && rider) {
    const riderReferralBalance = rider.referralEarning?.currentBalance || 0;
    if (riderReferralBalance >= referralEarningUsedAmount) {
      const deductionAmount = Math.min(adminCharges, referralEarningUsedAmount);
      adminCharges = Math.max(0, adminCharges - referralEarningUsedAmount);
      referralCommissionUsed = deductionAmount;
    }
  }
  
  const subtotal = baseTotal + adminCommission;
  const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);

  return {
    driverCharges: Math.round(driverCharges),
    pickCharges: Math.round(pickCharges),
    peakCharges: Math.round(peakCharges),
    nightCharges: Math.round(nightCharges),
    insuranceCharges: Math.round(insuranceCharges),
    cancellationCharges: 0,
    discount: model.discount || 0,
    gstCharges,
    subtotal: Math.round(subtotal),
    adminCharges,
    ...(isReferralEarningUsed && { referralCommissionUsed })
  };
};

module.exports = {
  calculateDriverRideCost,
  calculateCabRideCost,
  calculateParcelRideCost
};
