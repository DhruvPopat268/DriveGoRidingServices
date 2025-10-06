function isObjectComplete(obj) {
  if (!obj) return false;
  return Object.values(obj).every((value) => {
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
  } else if (!isObjectComplete(driver.paymentAndSubscription)) {
    step = 3;
  } else if (
    !isObjectComplete(driver.languageSkillsAndReferences) ||
    !driver.languageSkillsAndReferences?.references?.length
  ) {
    step = 4;
  } else if (
    !isObjectComplete(driver.declaration) ||
    !driver.declaration.agreement ||
    !driver.declaration.signature
  ) {
    step = 5;
  }

  const status = step === 0 ? "PendingForPayment" : "Pending";

  return { step, status };
}

module.exports = { evaluateDriverProgress };