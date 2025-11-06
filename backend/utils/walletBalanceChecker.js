const ServiceWalletBalance = require('../models/ServiceWalletBalance');
const driverWallet = require('../DriverModel/driverWallet');

/**
 * Check if driver has sufficient wallet balance for the service
 * @param {string} driverId - Driver's ID
 * @param {string} categoryId - Category ID
 * @param {string} subcategoryId - Subcategory ID
 * @param {string} subSubCategoryId - Sub-subcategory ID (optional)
 * @returns {Promise<{success: boolean, message?: string, requiredBalance?: number, currentBalance?: number}>}
 */
const checkDriverWalletBalance = async (driverId, categoryId, subcategoryId, subSubCategoryId = null) => {
  try {
    // Build query for service wallet balance
    const query = {
      category: categoryId,
      subcategory: subcategoryId
    };

    if (subSubCategoryId) {
      query.subSubCategory = subSubCategoryId;
    } else {
      query.$or = [
        { subSubCategory: { $exists: false } },
        { subSubCategory: null }
      ];
    }

    // Find minimum wallet balance requirement for this service
    const serviceWalletRule = await ServiceWalletBalance.findOne(query);

    if (!serviceWalletRule) {
      // No wallet balance rule found, allow the ride
      return { success: true };
    }

    // Get driver's current wallet balance
    const wallet = await driverWallet.findOne({ driverId });

    if (!wallet) {
      return {
        success: false,
        message: `Minimum wallet balance of ₹${serviceWalletRule.minWalletBalance} required for this ride`,
        requiredBalance: serviceWalletRule.minWalletBalance,
        currentBalance: 0
      };
    }

    const currentBalance = wallet.balance || 0;

    // Check if current balance is sufficient
    if (currentBalance < serviceWalletRule.minWalletBalance) {
      return {
        success: false,
        message: `Minimum wallet balance of ₹${serviceWalletRule.minWalletBalance} required for this ride. Current balance: ₹${currentBalance}`,
        requiredBalance: serviceWalletRule.minWalletBalance,
        currentBalance: currentBalance
      };
    }

    return { 
      success: true,
      currentBalance: currentBalance,
      requiredBalance: serviceWalletRule.minWalletBalance
    };

  } catch (error) {
    console.error('Error checking wallet balance:', error);
    throw new Error('Failed to check wallet balance');
  }
};

module.exports = {
  checkDriverWalletBalance
};