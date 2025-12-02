const moment = require("moment");
const mongoose = require("mongoose");
const Rider = require("../models/Rider");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const SubSubCategory = require("../models/SubSubCategory");
const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const peakHours = require("../models/Peak");
const pricecategories = require("../models/PriceCategory");

// 🧮 1️⃣ Function for Rider-based Calculation (specific category only)
const calculateDriverRideCharges = async ({
    riderId,
    categoryId,
    selectedDate,
    selectedTime,
    includeInsurance,
    selectedUsage,
    subcategoryId,
    subSubcategoryId,
    durationType,
    NoOfDays,
    selectedCategoryId // ✅ new param for specific price category
}) => {
    // //console.log('🔍 calculateDriverRideCharges - Input params:', {
    //     riderId, categoryId, selectedDate, selectedTime, includeInsurance,
    //     selectedUsage, subcategoryId, subSubcategoryId, durationType, NoOfDays, selectedCategoryId
    // });

    const rider = await Rider.findById(riderId);
    //console.log('👤 Rider found:', rider ? 'Yes' : 'No');
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

    const formattedSubcategory = subcategory.name.toLowerCase();
    const formattedSubSubCategory = subSubCategory
        ? subSubCategory.name.toLowerCase()
        : null;

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

    // query ride costs (specific selectedCategoryId only)
    let rideCostQuery = {
        category: categoryId,
        subcategory: subcategoryId,
        subSubCategory: subSubcategoryId,
        priceCategory: new mongoose.Types.ObjectId(selectedCategoryId)
    };

    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
        rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
        rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    }

    //console.log('🔍 Driver rideCostQuery:', rideCostQuery);
    const model = await DriverRideCost.findOne(rideCostQuery);
    //console.log('📊 Driver model found:', model ? 'Yes' : 'No', model ? model._id : 'None');
    if (!model) throw new Error("No ride cost model found for this category");

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
    //console.log('🌙 Night time check:', { hour, isNight });
    //console.log('📈 Peak charges calculated:', peakCharges);

    const priceCategory = await pricecategories.findById(model.priceCategory);
    //console.log('🏷️ Price category:', priceCategory?.priceCategoryName);
    let driverCharges = model.baseFare || 0;
    //console.log('💰 Base fare:', driverCharges);

    // apply duration logic
    if (durationType && NoOfDays) {
        switch (durationType.toLowerCase()) {
            case "day":
                driverCharges = model.baseFare * NoOfDays;
                break;
            case "week":
                driverCharges = model.baseFare * NoOfDays * 7;
                break;
            case "month":
                driverCharges = model.baseFare * NoOfDays * 30;
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
    // const cancellationCharges = rider.cancellationCharges || 0;
    const totalPayable = Math.round(
        baseTotal + adjustedAdminCommission + gstCharges + modelInsurance 
        // + cancellationCharges
    );

    

    return {
        categoryId: priceCategory?._id,
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
        // cancellationCharges,
    };
};

// 🚗 2️⃣ Function for Cab-based Calculation (specific category only)
const calculateCabRideCharges = async ({
    categoryId,
    selectedDate,
    selectedTime,
    includeInsurance,
    selectedUsage,
    subcategoryId,
    subSubcategoryId,
    durationType,
    NoOfDays,
    selectedCategoryId // ✅ added here too
}) => {
    console.log('🚗 calculateCabRideCharges - Input params:', {
        categoryId, selectedDate, selectedTime, includeInsurance,
        selectedUsage, subcategoryId, subSubcategoryId, durationType, NoOfDays, selectedCategoryId
    });

    const category = await Category.findById(categoryId);
    if (!category) throw new Error("Category not found");

    const subcategory = await SubCategory.findById(subcategoryId);
    if (!subcategory) throw new Error("Subcategory not found");

    const subSubCategory = subSubcategoryId
        ? await SubSubCategory.findById(subSubcategoryId)
        : null;
    if (subSubcategoryId && !subSubCategory)
        throw new Error("Sub-Subcategory not found");

    const formattedSubcategory = subcategory.name.toLowerCase();
    const formattedSubSubCategory = subSubCategory
        ? subSubCategory.name.toLowerCase()
        : null;

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

    let rideCostQuery = {
        category: new mongoose.Types.ObjectId(categoryId),
        subcategory: new mongoose.Types.ObjectId(subcategoryId),
        car: new mongoose.Types.ObjectId(selectedCategoryId),
    };

    if (subSubcategoryId) {
        rideCostQuery.subSubCategory = new mongoose.Types.ObjectId(subSubcategoryId);
    }

    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
        rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
        rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    }

    //console.log('🚗 Cab rideCostQuery:', rideCostQuery);
    const model = await CabRideCost.findOne(rideCostQuery)
        .populate("category", "name")
        .populate("car", "name");

    //console.log('📊 Cab model found:', model ? 'Yes' : 'No', model ? model._id : 'None');
    if (!model) throw new Error("No ride cost model found for this car category");

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

    const priceCategory = await pricecategories.findById(model.priceCategory);
    let driverCharges = model.baseFare || 0;

    if (durationType && NoOfDays) {
        switch (durationType.toLowerCase()) {
            case "day":
                driverCharges = model.baseFare * NoOfDays;
                break;
            case "week":
                driverCharges = model.baseFare * NoOfDays * 7;
                break;
            case "month":
                driverCharges = model.baseFare * NoOfDays * 30;
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

    console.log('📊 Cab Final calculations:', {
        baseTotal, adminCommission, adjustedAdminCommission, gstCharges, totalPayable
    });

    return {
        categoryId: model.car?._id || null,
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
    };
};

// return {
//     categoryId: model.car?._id || null,
//     category: model.car?.name,
//     driverCharges: Math.round(driverCharges),
//     pickCharges: Math.round(modelPickCharges),
//     peakCharges: Math.round(peakCharges),
//     insuranceCharges: Math.round(modelInsurance),
//     nightCharges: Math.round(modelNightCharges),
//     adminCommissionOriginal: adminCommission,
//     adminCommissionAdjusted: adjustedAdminCommission,
//     discountApplied: model.discount || 0,
//     gstCharges,
//     subtotal: Math.round(subtotal),
//     totalPayable,
// };

module.exports = {
    calculateDriverRideCharges,
    calculateCabRideCharges
};