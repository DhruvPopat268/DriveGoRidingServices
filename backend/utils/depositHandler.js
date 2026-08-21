const driverWallet = require("../DriverModel/driverWallet");
const MinHoldBalance = require("../models/MinWithdrawBalance");
const Driver = require("../DriverModel/DriverModel");
const SubscriptionPlan = require("../DriverModel/SubscriptionPlan");
const AdminWalletLedger = require("../models/AdminWalletLedger");

const handleDriverDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { driverId } = notes;

    
    if (!driverId) {
      return { success: false, error: "Driver ID not found in payment notes" };
    }

    // First, check if transaction already exists (any status)
    let wallet = await driverWallet.findOne({
      driverId: driverId,
      'transactions.razorpayPaymentId': paymentId
    });


    let transaction;
    
    if (wallet) {
      // Transaction exists - find it
      transaction = wallet.transactions.find(
        t => t.razorpayPaymentId === paymentId
      );
      
      if (transaction && transaction.status !== 'pending') {
        // Transaction already processed
        return {
          success: true,
          message: `Transaction already processed with status: ${transaction.status}`,
          details: {
            paymentId,
            driverId,
            amount: transaction.amount,
            status: transaction.status,
            newBalance: wallet.balance
          }
        };
      }
    } else {
      // No wallet found, get or create wallet for this driver
      wallet = await driverWallet.findOne({ driverId });
      if (!wallet) {
        wallet = await driverWallet.create({
          driverId,
          balance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          totalDeductions: 0,
          totalIncentives: 0,
          transactions: []
        });
      }
    }

    if (!transaction) {
      // Webhook came first - create new transaction with webhook status
      
      const statusMap = {
        'captured': 'completed',
        'paid': 'completed',
        'authorized': 'pending',
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

      transaction = {
        type: "deposit",
        amount: webhookAmount,
        status: mappedStatus,
        razorpayPaymentId: paymentId,
        description: `Driver wallet deposit via Razorpay - ${status} (webhook first)`,
        paymentMethod: "razorpay",
        webhookVerified: true,
        webhookTimestamp: new Date()
      };


      wallet.transactions.push(transaction);
      
      // Handle balance updates based on status
      if (mappedStatus === 'completed') {
        wallet.balance += webhookAmount;
      } else if (mappedStatus === 'refunded') {
        // For refund webhook first, deduct from wallet balance
        wallet.balance = Math.max(0, wallet.balance - webhookAmount);
      } else if (mappedStatus === 'failed') {
        // For failed webhook first, just log - no balance change
      } else if (mappedStatus === 'pending') {
        // For authorized webhook first, just log - no balance change yet
      }

      await wallet.save();

      return {
        success: true,
        message: `Driver deposit ${mappedStatus} (webhook first)`,
        details: {
          paymentId,
          driverId,
          amount: webhookAmount,
          status: mappedStatus,
          newBalance: wallet.balance
        }
      };
    }

    // Transaction exists and is pending - update it

    // SECURITY: Verify amount matches what was stored
    if (webhookAmount && transaction.amount !== webhookAmount) {
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
      'authorized': 'pending',
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

    // Handle balance updates based on status
    if (mappedStatus === 'completed' && oldStatus === 'pending') {
      wallet.balance += transaction.amount;
    } else if (mappedStatus === 'refunded') {
      // Create new refund transaction and deduct amount from wallet
      const refundTransaction = {
        type: "refund",
        amount: transaction.amount,
        status: "completed",
        razorpayPaymentId: paymentId,
        description: `Refund for payment ${paymentId} - ${status}`,
        paymentMethod: "razorpay",
        webhookVerified: true,
        webhookTimestamp: new Date()
      };
      
      wallet.transactions.push(refundTransaction);
      wallet.balance = Math.max(0, wallet.balance - transaction.amount); // Ensure balance doesn't go negative
    } else if (mappedStatus === 'failed' && oldStatus === 'pending') {
      // For failed transactions, just log - no balance change needed
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
    return { success: false, error: error.message };
  }
};

const handleUserWalletDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { riderId } = notes;

    
    if (!riderId) {
      return { success: false, error: "Rider ID not found in payment notes" };
    }


    const { Wallet } = require('../models/Payment&Wallet');

    // Check if transaction already exists
    let wallet = await Wallet.findOne({
      riderId: riderId,
      'transactions.razorpayPaymentId': paymentId
    });

    let transaction;
    
    if (wallet) {
      // Transaction exists - find it
      transaction = wallet.transactions.find(
        t => t.razorpayPaymentId === paymentId
      );
      
      if (transaction && transaction.status !== 'pending') {
        // Transaction already processed
        return {
          success: true,
          message: `Transaction already processed with status: ${transaction.status}`,
          details: {
            paymentId,
            riderId,
            amount: transaction.amount,
            status: transaction.status,
            newBalance: wallet.balance
          }
        };
      }
    } else {
      // Get or create wallet
      wallet = await Wallet.findOne({ riderId });
      if (!wallet) {
        wallet = await Wallet.create({
          riderId,
          balance: 0,
          totalDeposited: 0,
          totalSpent: 0,
          transactions: []
        });
      }
    }



    if (!transaction) {
      // Webhook came first - create new transaction with webhook status
      
      const statusMap = {
        'captured': 'completed',
        'paid': 'completed',
        'authorized': 'pending',
        'failed': 'failed',
        'voided': 'failed',
        'cancelled': 'failed',
        'refunded': 'refunded'
      };

      const mappedStatus = statusMap[status];
      if (!mappedStatus) {
        return { success: false, error: `Unsupported status: ${status}` };
      }

      transaction = {
        type: "deposit",
        amount: webhookAmount,
        status: mappedStatus,
        razorpayPaymentId: paymentId,
        description: `User wallet deposit via Razorpay - ${status} (webhook first)`,
        paymentMethod: "razorpay",
        webhookVerified: true,
        webhookTimestamp: new Date(),
        paidAt: mappedStatus === 'completed' ? new Date() : null
      };

      wallet.transactions.push(transaction);
      
      // Handle balance updates based on status
      if (mappedStatus === 'completed') {
        wallet.balance += webhookAmount;
        wallet.totalDeposited += webhookAmount;
        wallet.lastTransactionAt = new Date();
      } else if (mappedStatus === 'refunded') {
        // For refund webhook first, deduct from wallet balance
        wallet.balance = Math.max(0, wallet.balance - webhookAmount);
      } else if (mappedStatus === 'failed') {
        // For failed webhook first, just log - no balance change
      } else if (mappedStatus === 'pending') {
        // For authorized webhook first, just log - no balance change yet
      }

      await wallet.save();

      return {
        success: true,
        message: `User deposit ${mappedStatus} (webhook first)`,
        details: {
          paymentId,
          riderId,
          amount: webhookAmount,
          status: mappedStatus,
          newBalance: wallet.balance
        }
      };
    }

    // Transaction exists and is pending - update it

    // SECURITY: Verify amount matches what was stored
    if (webhookAmount && transaction.amount !== webhookAmount) {
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
      'authorized': 'pending',
      'failed': 'failed',
      'voided': 'failed',
      'cancelled': 'failed',
      'refunded': 'refunded'
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      return { success: false, error: `Unsupported status: ${status}` };
    }

    const oldStatus = transaction.status;
    transaction.status = mappedStatus;
    transaction.description = `User wallet deposit via Razorpay - ${status} (verified by webhook)`;
    transaction.webhookVerified = true;
    transaction.webhookTimestamp = new Date();
    transaction.paidAt = mappedStatus === 'completed' ? new Date() : transaction.paidAt;

    // Handle balance updates based on status
    if (mappedStatus === 'completed' && oldStatus === 'pending') {
      wallet.balance += transaction.amount;
      wallet.totalDeposited += transaction.amount;
      wallet.lastTransactionAt = new Date();
    } else if (mappedStatus === 'refunded') {
      // Create new refund transaction and deduct amount from wallet
      const refundTransaction = {
        type: "refund",
        amount: transaction.amount,
        status: "completed",
        razorpayPaymentId: paymentId,
        description: `Refund for payment ${paymentId} - ${status}`,
        paymentMethod: "razorpay",
        webhookVerified: true,
        webhookTimestamp: new Date()
      };
      
      wallet.transactions.push(refundTransaction);
      wallet.balance = Math.max(0, wallet.balance - transaction.amount);
    } else if (mappedStatus === 'failed' && oldStatus === 'pending') {
      // For failed transactions, just log - no balance change needed
    }

    await wallet.save();

    return {
      success: true,
      message: `User deposit ${mappedStatus}`,
      details: {
        paymentId,
        riderId,
        amount: transaction.amount,
        status: mappedStatus,
        newBalance: wallet.balance
      }
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
};

const handleDriverPlanPurchase = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { driverId, planId } = notes;
    
    if (!driverId) {
      return { success: false, error: "Driver ID not found in payment notes" };
    }

    if (!planId) {
      return { success: false, error: "Plan ID not found in payment notes" };
    }

    // Check if plan purchase already exists
    let driver = await Driver.findOne({
      _id: driverId,
      'purchasedPlans.paymentId': paymentId
    });

    let existingPlan;
    
    if (driver) {
      // Plan purchase exists - find it
      existingPlan = driver.purchasedPlans.find(
        p => p.paymentId === paymentId
      );
      
      if (existingPlan && existingPlan.status !== 'Pending') {
        // Plan purchase already processed
        return {
          success: true,
          message: `Plan purchase already processed with status: ${existingPlan.status}`,
          details: {
            paymentId,
            driverId,
            planId,
            amount: existingPlan.amount,
            status: existingPlan.status
          }
        };
      }
    } else {
      // Get driver
      driver = await Driver.findById(driverId);
      if (!driver) {
        return { success: false, error: "Driver not found" };
      }
    }

    // Get plan details
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return { success: false, error: "Subscription plan not found" };
    }

    // Status mapping
    const statusMap = {
      'captured': 'Success',
      'paid': 'Success',
      'authorized': 'Pending',
      'failed': 'Failed',
      'voided': 'Failed',
      'cancelled': 'Failed',
      'refunded': 'Failed'
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      return { success: false, error: `Unsupported status: ${status}` };
    }

    if (!existingPlan) {
      // Webhook came first - create new plan purchase
      
      const planPurchase = {
        paymentId,
        status: mappedStatus,
        plan: planId,
        amount: webhookAmount,
        purchasedAt: new Date()
      };

      driver.purchasedPlans.push(planPurchase);
      
      // Add transaction to admin wallet ledger for successful payments
      if (mappedStatus === 'Success') {
        try {
          let adminLedger = await AdminWalletLedger.findOne();
          if (!adminLedger) {
            adminLedger = new AdminWalletLedger();
          }
          
          adminLedger.addTransaction({
            transactionType: "CREDIT",
            amount: webhookAmount,
            description: `Driver registration fee or Driver purchase plan - ${plan.name}`,
            type: "DRIVER_REGISTRATION_OR_SUBSCRIPTION_PLAN_PURCHASE",
            status: "COMPLETED"
          });
          
          await adminLedger.save();
        } catch (adminError) {
        }
      }
      
      // Handle plan activation for successful payments
      if (mappedStatus === 'Success') {
        // Update current plan and expiry date
        const now = new Date();
        let expiryDate;
        if (driver.currentPlan?.expiryDate && driver.currentPlan.expiryDate > now) {
          expiryDate = new Date(driver.currentPlan.expiryDate);
          expiryDate.setDate(expiryDate.getDate() + plan.days);
        } else {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + plan.days);
        }
        
        driver.currentPlan = { planId: plan._id, expiryDate };
        driver.paymentAndSubscription.subscriptionPlan = plan._id;
        
        // Update status from PendingForPayment to Onreview if applicable
        if (driver.status === 'PendingForPayment') {
          driver.status = 'Onreview';
        }
        
      } else if (mappedStatus === 'Failed') {
      } else if (mappedStatus === 'Pending') {
      }

      await driver.save();

      return {
        success: true,
        message: `Driver plan purchase ${mappedStatus.toLowerCase()} (webhook first)`,
        details: {
          paymentId,
          driverId,
          planId,
          planName: plan.name,
          amount: webhookAmount,
          status: mappedStatus
        }
      };
    }

    // Plan purchase exists and is pending - update it

    // SECURITY: Verify amount matches what was stored
    if (webhookAmount && existingPlan.amount !== webhookAmount) {
      existingPlan.status = 'Failed';
      await driver.save();
      return { 
        success: false, 
        error: "Amount mismatch", 
        details: { stored: existingPlan.amount, webhook: webhookAmount }
      };
    }

    const oldStatus = existingPlan.status;
    existingPlan.status = mappedStatus;

    // Handle plan activation for successful payments
    if (mappedStatus === 'Success' && oldStatus === 'Pending') {
      // Update current plan and expiry date
      const now = new Date();
      let expiryDate;
      if (driver.currentPlan?.expiryDate && driver.currentPlan.expiryDate > now) {
        expiryDate = new Date(driver.currentPlan.expiryDate);
        expiryDate.setDate(expiryDate.getDate() + plan.days);
      } else {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.days);
      }
      
      driver.currentPlan = { planId: plan._id, expiryDate };
      driver.paymentAndSubscription.subscriptionPlan = plan._id;
      
      // Update status from PendingForPayment to Onreview if applicable
      if (driver.status === 'PendingForPayment') {
        driver.status = 'Onreview';
      }
      
      
      // Add transaction to admin wallet ledger
      try {
        let adminLedger = await AdminWalletLedger.findOne();
        if (!adminLedger) {
          adminLedger = new AdminWalletLedger();
        }
        
        adminLedger.addTransaction({
          transactionType: "CREDIT",
          amount: existingPlan.amount,
          description: `Driver registration fee or Driver purchase plan - ${plan.name}`,
          type: "DRIVER_REGISTRATION_OR_SUBSCRIPTION_PLAN_PURCHASE",
          status: "COMPLETED"
        });
        
        await adminLedger.save();
      } catch (adminError) {
      }
    } else if (mappedStatus === 'Failed' && oldStatus === 'Pending') {
    }

    await driver.save();

    return {
      success: true,
      message: `Driver plan purchase ${mappedStatus.toLowerCase()}`,
      details: {
        paymentId,
        driverId,
        planId,
        planName: plan.name,
        amount: existingPlan.amount,
        status: mappedStatus
      }
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
};

const processDeposit = async (paymentId, status, webhookAmount, notes) => {
  try {
    const { type } = notes;

    if (!type) {
      return { success: false, error: "Payment type not specified in notes" };
    }


    switch (type) {
      case 'driver_deposit':
        return await handleDriverDeposit(paymentId, status, webhookAmount, notes);
      
      case 'user_deposit':
        return await handleUserWalletDeposit(paymentId, status, webhookAmount, notes);
      
      case 'driver_plan_purchase':
        return await handleDriverPlanPurchase(paymentId, status, webhookAmount, notes);
      
      default:
        return { 
          success: false, 
          error: `Unsupported payment type: ${type}`,
          supportedTypes: ['driver_deposit', 'user_deposit', 'driver_plan_purchase']
        };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  processDeposit,
  handleDriverDeposit,
  handleUserWalletDeposit,
  handleDriverPlanPurchase
};