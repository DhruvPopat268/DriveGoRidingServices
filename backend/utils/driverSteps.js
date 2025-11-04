function isObjectComplete(obj, optionalFields = []) {
  if (!obj) return false;
  return Object.entries(obj).every(([key, value]) => {
    // Skip optional fields
    if (optionalFields.includes(key)) return true;
    
    if (value === null || value === undefined || value === "") return false;

    // If array, check non-empty
    if (Array.isArray(value)) return value.length > 0;

    // If object, recursively check
    if (typeof value === "object" && !(value instanceof Date)) {
      return isObjectComplete(value);
    }
    return true;
  });
}

/**
 * Evaluates driver's profile completion step and status
 * @param {Object} driver - Driver mongoose document
 * @returns {Object} { step: number, status: string }
 */
function evaluateDriverProgress(driver) {
  let step = 0;

  if (!isObjectComplete(driver.personalInformation)) {
    step = 1;
  } else if (!isObjectComplete(driver.drivingDetails)) {
    step = 2;
  } else if (!isObjectComplete(driver.paymentAndSubscription, ['upiQrCode'])) {
    step = 3;
  } else if (
    !isObjectComplete(driver.languageSkillsAndReferences) ||
    !driver.languageSkillsAndReferences?.references?.length
  ) {
    step = 4;
  } else if (
    !isObjectComplete(driver.declaration) ||
    !driver.declaration.signature
  ) {
    step = 5;
  }

  // Check if driver has valid currentPlan
  const hasValidPlan = driver.currentPlan?.planId && 
                      driver.currentPlan?.expiryDate && 
                      new Date(driver.currentPlan.expiryDate) > new Date();

  const status = step === 0 ? (hasValidPlan ? "Onreview" : "PendingForPayment") : "Pending";

  return { step, status };
}

module.exports = { evaluateDriverProgress };