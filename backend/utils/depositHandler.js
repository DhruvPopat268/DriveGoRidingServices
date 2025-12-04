const driverWallet = require("../DriverModel/driverWallet");
const MinHoldBalance = require("../models/MinWithdrawBalance");

/**
 * Handle driver wallet deposit
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} status - Payment status from webhook
 * @param {number} webhookAmount - Amount from webhook (in rupees)
 * @param {Object} notes - Payment notes containing type and driverId
 * @returns {Object} - Processing result
 */
const handleDriverDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { driverId } = notes;
    
    if (!driverId) {
      return { success: false, error: "Driver ID not found in payment notes" };
    }

    // Find wallet with pending transaction
    const wallet = await driverWallet.findOne({
      'transactions.razorpayPaymentId': paymentId,
      'transactions.status': 'pending'
    });

    if (!wallet) {
      return { success: false, error: `Transaction not found for payment_id: ${paymentId}` };
    }

    // Find and update the transaction
    const transaction = wallet.transactions.find(
      t => t.razorpayPaymentId === paymentId && t.status === 'pending'
    );

    if (!transaction) {
      return { success: false, error: "Pending transaction not found" };
    }

    // SECURITY: Verify amount matches what was stored
    if (webhookAmount && transaction.amount !== webhookAmount) {
      console.error(`⚠️ Amount mismatch for ${paymentId}: stored=${transaction.amount}, webhook=${webhookAmount}`);
      transaction.status = 'failed';
      transaction.description = `Amount verification failed - stored: ₹${transaction.amount}, webhook: ₹${webhookAmount}`;
      await wallet.save();
      return { 
        success: false, 
        error: "Amount mismatch", 
        details: { stored: transaction.amount, webhook: webhookAmount }
      };
    }

    // Status mapping
    const statusMap = {
      'captured': 'completed',
      'paid': 'completed',
      'failed': 'failed',
      'voided': 'failed',
      'cancelled': 'failed',
      'refunded': 'refunded',
      'partial_refunded': 'partial_refund'
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      return { success: false, error: `Unsupported status: ${status}` };
    }

    const oldStatus = transaction.status;
    transaction.status = mappedStatus;
    transaction.description = `Driver wallet deposit via Razorpay - ${status} (verified by webhook)`;
    transaction.webhookVerified = true;
    transaction.webhookTimestamp = new Date();

    // Add money to wallet only if completed and verified
    if (mappedStatus === 'completed' && oldStatus === 'pending') {
      wallet.balance += transaction.amount;
      console.log(`✅ Driver deposit verified and completed: ${paymentId}, Amount: ₹${transaction.amount}, Driver: ${driverId}`);
    }

    await wallet.save();

    return {
      success: true,
      message: `Driver deposit ${mappedStatus}`,
      details: {
        paymentId,
        driverId,
        amount: transaction.amount,
        status: mappedStatus,
        newBalance: wallet.balance
      }
    };

  } catch (error) {
    console.error("Driver deposit handler error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Handle user wallet deposit (placeholder for future implementation)
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} status - Payment status from webhook
 * @param {number} webhookAmount - Amount from webhook (in rupees)
 * @param {Object} notes - Payment notes containing type and userId
 * @returns {Object} - Processing result
 */
const handleUserWalletDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { userId } = notes;
    
    if (!userId) {
      return { success: false, error: "User ID not found in payment notes" };
    }

    // TODO: Implement user wallet deposit logic
    console.log(`📝 User wallet deposit handler called: ${paymentId}, User: ${userId}, Amount: ₹${webhookAmount}`);
    
    return {
      success: true,
      message: "User wallet deposit handler - Not implemented yet",
      details: { paymentId, userId, amount: webhookAmount, status }
    };

  } catch (error) {
    console.error("User wallet deposit handler error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Handle driver plan purchase (placeholder for future implementation)
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} status - Payment status from webhook
 * @param {number} webhookAmount - Amount from webhook (in rupees)
 * @param {Object} notes - Payment notes containing type and driverId
 * @returns {Object} - Processing result
 */
const handleDriverPlanPurchase = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { driverId, planId } = notes;
    
    if (!driverId) {
      return { success: false, error: "Driver ID not found in payment notes" };
    }

    // TODO: Implement driver plan purchase logic
    console.log(`📝 Driver plan purchase handler called: ${paymentId}, Driver: ${driverId}, Plan: ${planId}, Amount: ₹${webhookAmount}`);
    
    return {
      success: true,
      message: "Driver plan purchase handler - Not implemented yet",
      details: { paymentId, driverId, planId, amount: webhookAmount, status }
    };

  } catch (error) {
    console.error("Driver plan purchase handler error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Main deposit processor - routes to appropriate handler based on payment type
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} status - Payment status from webhook
 * @param {number} webhookAmount - Amount from webhook (in rupees)
 * @param {Object} notes - Payment notes containing type and other details
 * @returns {Object} - Processing result
 */
const processDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { type } = notes;

    if (!type) {
      return { success: false, error: "Payment type not specified in notes" };
    }

    console.log(`🔄 Processing ${type} deposit: ${paymentId}, Status: ${status}, Amount: ₹${webhookAmount}`);

    switch (type) {
      case 'driver_deposit':
        return await handleDriverDeposit(paymentId, status, webhookAmount, notes);
      
      case 'user_wallet_deposit':
        return await handleUserWalletDeposit(paymentId, status, webhookAmount, notes);
      
      case 'driver_plan_purchase':
        return await handleDriverPlanPurchase(paymentId, status, webhookAmount, notes);
      
      default:
        return { 
          success: false, 
          error: `Unsupported payment type: ${type}`,
          supportedTypes: ['driver_deposit', 'user_wallet_deposit', 'driver_plan_purchase']
        };
    }

  } catch (error) {
    console.error("Deposit processor error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  processDeposit,
  handleDriverDeposit,
  handleUserWalletDeposit,
  handleDriverPlanPurchase
};