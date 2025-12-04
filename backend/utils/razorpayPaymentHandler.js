const driverWallet = require("../DriverModel/driverWallet");

const handleDriverDeposit = async (paymentId, status, webhookAmount, notes) => {
  const { driverId } = notes;
  
  if (!driverId) {
    return { success: false, error: "Driver ID not found in payment notes" };
  }

  const wallet = await driverWallet.findOne({
    'transactions.razorpayPaymentId': paymentId,
    'transactions.status': 'pending'
  });

  if (!wallet) {
    return { success: false, error: `Transaction not found for payment_id: ${paymentId}` };
  }

  const transaction = wallet.transactions.find(
    t => t.razorpayPaymentId === paymentId && t.status === 'pending'
  );

  if (!transaction) {
    return { success: false, error: "Pending transaction not found" };
  }

  // Verify amount
  if (webhookAmount && transaction.amount !== webhookAmount) {
    transaction.status = 'failed';
    transaction.description = `Amount verification failed - stored: ₹${transaction.amount}, webhook: ₹${webhookAmount}`;
    await wallet.save();
    return { success: false, error: "Amount mismatch" };
  }

  const statusMap = {
    'captured': 'completed',
    'paid': 'completed',
    'failed': 'failed',
    'voided': 'failed',
    'cancelled': 'failed'
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) {
    return { success: false, error: `Unsupported status: ${status}` };
  }

  transaction.status = mappedStatus;
  transaction.description = `Driver wallet deposit - ${status} (verified by webhook)`;
  transaction.webhookVerified = true;

  if (mappedStatus === 'completed') {
    wallet.balance += transaction.amount;
  }

  await wallet.save();

  return {
    success: true,
    message: `Driver deposit ${mappedStatus}`,
    details: { paymentId, driverId, amount: transaction.amount, status: mappedStatus }
  };
};

const processPayment = async (paymentId, status, webhookAmount, notes) => {
  const { type } = notes;

  if (!type) {
    return { success: false, error: "Payment type not specified in notes" };
  }

  switch (type) {
    case 'driver_deposit':
      return await handleDriverDeposit(paymentId, status, webhookAmount, notes);
    
    case 'user_wallet_deposit':
      // TODO: Implement user wallet deposit
      return { success: true, message: "User wallet deposit - Not implemented yet" };
    
    case 'driver_plan_purchase':
      // TODO: Implement driver plan purchase
      return { success: true, message: "Driver plan purchase - Not implemented yet" };
    
    default:
      return { success: false, error: `Unsupported payment type: ${type}` };
  }
};

module.exports = { processPayment };