function getRequiredFields(sectionName, category) {
  const schemas = {
    PersonalInformation: ['fullName', 'dateOfBirth', 'gender', 'alternateNumber', 'email', 'currentAddress', 'permanentAddress', 'category', 'subCategory', 'aadhar', 'panCard', 'drivingLicense', 'passportPhoto'],
    CabVehicleDetails: ['ownership'],
    ParcelVehicleDetails: ['ownership'],
    DrivingDetails: category === 'Driver' ? ['drivingExperienceYears', 'licenseType', 'vehicleType', 'canDrive', 'preferredWork'] : ['drivingExperienceYears', 'licenseType', 'preferredWork'],
    PaymentAndSubscription: ['preferredPaymentCycle', 'bankAccountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'upiId', 'oneTimeRegistrationFee', 'subscriptionPlan'],
    LanguageSkillsAndReferences: category === 'Driver' ? ['knownLanguages', 'references'] : ['knownLanguages'],
    Declaration: ['signature']
  };
  return schemas[sectionName] || [];
}

function isObjectComplete(obj, optionalFields = [], category = null, sectionName = '') {
  if (!obj) {
    if (sectionName) console.log(`❌ ${sectionName}: Object is null/undefined`);
    return false;
  }
  
  const requiredFields = getRequiredFields(sectionName, category);
  const missingFields = [];
  
  const result = requiredFields.every(field => {
    if (optionalFields.includes(field)) {
      return true;
    }
    
    const value = obj[field];
    
    if (value === null || value === undefined || value === "") {
      missingFields.push(field);
      return false;
    }

    if (Array.isArray(value) && value.length === 0) {
      missingFields.push(`${field} (empty array)`);
      return false;
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
  else if (category === "Cab" && !isObjectComplete(driver.cabVehicleDetails, [], category, 'CabVehicleDetails')) {
    console.log('❌ Step 2: CabVehicleDetails incomplete');
    step = 2;
  } else if (category === "Parcel" && !isObjectComplete(driver.parcelVehicleDetails, [], category, 'ParcelVehicleDetails')) {
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
    !driver.languageSkillsAndReferences?.references?.length
  ) {
    if (!driver.languageSkillsAndReferences?.references?.length) {
      console.log('❌ LanguageSkillsAndReferences: references array is empty or missing');
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

  const status = step === 0 ? (hasValidPlan ? "Onreview" : "PendingForPayment") : "Pending";

  if (step === 0) {
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