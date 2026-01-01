const express = require('express');
const router = express.Router();
const AdminWalletLedger = require('../models/AdminWalletLedger');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get admin wallet stats and transactions with pagination
router.get('/ledger', adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get admin wallet
    let adminWallet = await AdminWalletLedger.findOne();
    if (!adminWallet) {
      adminWallet = new AdminWalletLedger();
      await adminWallet.save();
    }

    // Get paginated transactions (sorted by newest first)
    const totalTransactions = adminWallet.transactions.length;
    const transactions = adminWallet.transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      stats: {
        currentBalance: adminWallet.currentBalance,
        totalCredits: adminWallet.totalCredits,
        totalDebits: adminWallet.totalDebits,
        lastUpdated: adminWallet.lastUpdated
      },
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
        limit
      }
    });
  } catch (error) {
    console.error('Admin wallet ledger error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get admin wallet summary stats only
router.get('/stats', adminAuthMiddleware, async (req, res) => {
  try {
    let adminWallet = await AdminWalletLedger.findOne();
    if (!adminWallet) {
      adminWallet = new AdminWalletLedger();
      await adminWallet.save();
    }

    res.json({
      success: true,
      stats: {
        currentBalance: adminWallet.currentBalance,
        totalCredits: adminWallet.totalCredits,
        totalDebits: adminWallet.totalDebits,
        lastUpdated: adminWallet.lastUpdated,
        totalTransactions: adminWallet.transactions.length
      }
    });
  } catch (error) {
    console.error('Admin wallet stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;