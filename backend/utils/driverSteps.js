function isObjectComplete(obj, optionalFields = [], category = null, sectionName = '') {
  if (!obj) {
    if (sectionName) console.log(`❌ ${sectionName}: Object is null/undefined`);
    return false;
  }
  
  const missingFields = [];
  const result = Object.entries(obj).every(([key, value]) => {
    // Skip optional fields, MongoDB auto-generated fields, and Mongoose internal properties
    if (optionalFields.includes(key) || 
        key === "_id" || key === "__v" || 
        key.startsWith("$") || key.startsWith("_")) {
      return true;
    }
    
    if (value === null || value === undefined || value === "") {
      missingFields.push(key);
      return false;
    }

    // If array, check non-empty (but skip vehicleType and canDrive for non-Driver categories)
    if (Array.isArray(value)) {
      // Skip vehicleType and canDrive validation for non-Driver categories in drivingDetails
      if (category && category !== "Driver" && ["vehicleType", "canDrive"].includes(key) && 
          sectionName === 'DrivingDetails') {
        return true;
      }
      
      if (value.length === 0) {
        missingFields.push(`${key} (empty array)`);
        return false;
      }
      return true;
    }

    // If object, recursively check
    if (typeof value === "object" && !(value instanceof Date)) {
      const nestedResult = isObjectComplete(value, [], category, `${sectionName}.${key}`);
      if (!nestedResult) {
        missingFields.push(`${key} (nested object incomplete)`);
      }
      return nestedResult;
    }
    return true;
  });
  
  if (!result && sectionName && missingFields.length > 0) {
    console.log(`❌ ${sectionName} missing fields:`, missingFields);
  }
  
  return result;
}

/**
 * Evaluates driver's profile completion step and status based on category
 * @param {Object} driver - Driver mongoose document
 * @returns {Object} { step: number, status: string }
 */
function evaluateDriverProgress(driver) {
  let step = 0;
  const category = driver.selectedCategory?.name || "Driver";
  
  console.log(`🔍 Evaluating progress for category: ${category}`);
  console.log(`🔍 Driver sections available:`, {
    personalInformation: !!driver.personalInformation,
    cabVehicleDetails: !!driver.cabVehicleDetails,
    parcelVehicleDetails: !!driver.parcelVehicleDetails,
    drivingDetails: !!driver.drivingDetails,
    paymentAndSubscription: !!driver.paymentAndSubscription,
    languageSkillsAndReferences: !!driver.languageSkillsAndReferences,
    declaration: !!driver.declaration
  });

  // Step 1: Personal Information (common for all categories)
  if (!isObjectComplete(driver.personalInformation, [], category, 'PersonalInformation')) {
    console.log('❌ Step 1: PersonalInformation incomplete');
    step = 1;
  } 
  // Step 2: Category-specific details
  else if (category === "Cab" && !isObjectComplete(driver.cabVehicleDetails, ['rcNumber', 'vehicleType', 'modelType', 'seatCapacity', 'color', 'fuelType', 'vehiclePhotos', 'insuranceValidUpto', 'pollutionValidUpto', 'taxValidUpto', 'fitnessValidUpto', 'permitValidUpto', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'], category, 'CabVehicleDetails')) {
    console.log('❌ Step 2: CabVehicleDetails incomplete');
    step = 2;
  } else if (category === "Parcel" && !isObjectComplete(driver.parcelVehicleDetails, ['rcNumber', 'vehicleType', 'modelType', 'length', 'width', 'height', 'weightCapacity', 'color', 'fuelType', 'vehiclePhotos', 'insuranceValidUpto', 'pollutionValidUpto', 'taxValidUpto', 'fitnessValidUpto', 'permitValidUpto', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'], category, 'ParcelVehicleDetails')) {
    console.log('❌ Step 2: ParcelVehicleDetails incomplete');
    step = 2;
  } else if (category === "Driver" && !isObjectComplete(driver.drivingDetails, [], category, 'DrivingDetails')) {
    console.log('❌ Step 2: DrivingDetails incomplete for Driver category');
    step = 2;
  } 
  // Step 3: Driving details for Cab/Parcel, Payment for Driver
  else if ((category === "Cab" || category === "Parcel") && !isObjectComplete(driver.drivingDetails, [], category, 'DrivingDetails')) {
    console.log('❌ Step 3: DrivingDetails incomplete for', category);
    console.log('🔍 DrivingDetails content:', JSON.stringify(driver.drivingDetails, null, 2));
    step = 3;
  } else if (category === "Driver" && !isObjectComplete(driver.paymentAndSubscription, ['upiQrCode'], category, 'PaymentAndSubscription')) {
    console.log('❌ Step 3: PaymentAndSubscription incomplete for Driver category');
    step = 3;
  }
  // Step 4: Payment and Subscription for Cab/Parcel
  else if ((category === "Cab" || category === "Parcel") && !isObjectComplete(driver.paymentAndSubscription, ['upiQrCode'], category, 'PaymentAndSubscription')) {
    console.log('❌ Step 4: PaymentAndSubscription incomplete for', category);
    console.log('🔍 PaymentAndSubscription exists:', !!driver.paymentAndSubscription);
    console.log('🔍 PaymentAndSubscription content:', JSON.stringify(driver.paymentAndSubscription, null, 2));
    step = 4;
  } 
  // Step 4/5: Language Skills and References
  else if (
    !isObjectComplete(driver.languageSkillsAndReferences, [], category, 'LanguageSkillsAndReferences') ||
    (category === "Driver" && !driver.languageSkillsAndReferences?.references?.length)
  ) {
    if (category === "Driver" && !driver.languageSkillsAndReferences?.references?.length) {
      console.log('❌ LanguageSkillsAndReferences: references array is empty or missing for Driver category');
    }
    console.log(`❌ Step ${category === "Driver" ? 4 : 5}: LanguageSkillsAndReferences incomplete`);
    console.log('🔍 LanguageSkillsAndReferences content:', JSON.stringify(driver.languageSkillsAndReferences, null, 2));
    step = category === "Driver" ? 4 : 5;
  } 
  // Step 5/6: Declaration
  else if (
    !isObjectComplete(driver.declaration, [], category, 'Declaration') ||
    !driver.declaration?.signature
  ) {
    if (!driver.declaration?.signature) {
      console.log('❌ Declaration: signature field is missing');
    }
    console.log(`❌ Step ${category === "Driver" ? 5 : 6}: Declaration incomplete`);
    step = category === "Driver" ? 5 : 6;
  }

  // Check if driver has valid currentPlan
  const hasValidPlan = driver.currentPlan?.planId && 
                      driver.currentPlan?.expiryDate && 
                      new Date(driver.currentPlan.expiryDate) > new Date();

  // Determine final step and status
  if (step === 0) {
    step = hasValidPlan ? null : 0;
  }
  
  const status = step === null ? "Onreview" : (step === 0 ? "PendingForPayment" : "Pending");

  if (step === null || step === 0) {
    console.log('✅ All steps completed! Driver ready for review/payment');
  }
  
  console.log(`🏁 FINAL EVALUATION RESULT:`);
  console.log(`   Category: ${category}`);
  console.log(`   Current Step: ${step}`);
  console.log(`   Status: ${status}`);
  console.log(`   Driver ID: ${driver._id || 'N/A'}`);
  console.log(`Driver Progress Evaluated from driverStep.js: Step ${step}, Status: ${status}, Category: ${category}`);

  return { step, status };
}

module.exports = { evaluateDriverProgress, isObjectComplete };