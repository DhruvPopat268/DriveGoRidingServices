const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { RiderBankDetails, RiderUpiDetails } = require('../models/RiderBankCard');
const authMiddleware = require('../middleware/authMiddleware');

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Cache directory creation
const createdDirs = new Set();

// Image upload function (similar to driver routes)
const uploadToServerFast = async (fileBuffer, filename, isImage = true) => {
  const folder = isImage ? "images" : "documents";
  const uploadPath = path.join(__dirname, `../cloud/${folder}`);

  if (!createdDirs.has(uploadPath)) {
    await fs.mkdir(uploadPath, { recursive: true });
    createdDirs.add(uploadPath);
  }

  const filePath = path.join(uploadPath, filename);

  if (isImage) {
    await sharp(fileBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({
        quality: 70,
        effort: 1,
        smartSubsample: true
      })
      .toFile(filePath);
  } else {
    await fs.writeFile(filePath, fileBuffer);
  }

  return `https://adminbackend.hire4drive.com/app/cloud/${folder}/${filename}`;
};

// CREATE - Add payment method (bank or UPI)
router.post('/', authMiddleware, upload.single('upiQrCode'), async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const { paymentMethod } = req.body;

    if (!paymentMethod || !['bank_transfer', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Valid paymentMethod (bank_transfer or upi) is required' });
    }

    if (paymentMethod === 'bank_transfer') {
      const { bankAccountHolderName, accountNumber, ifscCode, bankName } = req.body;

      if (!bankAccountHolderName || !accountNumber || !ifscCode || !bankName) {
        return res.status(400).json({ message: 'All bank details are required' });
      }

      // Check if bank details already exist
      const existingBankDetails = await RiderBankDetails.findOne({
        accountNumber,
        ifscCode
      });

      if (existingBankDetails) {
        return res.status(400).json({ message: 'These bank details already exist in our system' });
      }

      const bankDetails = await RiderBankDetails.create({
        riderId,
        paymentMethod: 'bank_transfer',
        bankAccountHolderName,
        accountNumber,
        ifscCode,
        bankName
      });

      return res.json({
        success: true,
        message: 'Bank details added successfully',
        data: bankDetails
      });
    }

    if (paymentMethod === 'upi') {
      const { upiId } = req.body;

      if (!upiId) {
        return res.status(400).json({ message: 'UPI ID is required' });
      }

      // Check if UPI ID already exists
      const existingUpiDetails = await RiderUpiDetails.findOne({ upiId });

      if (existingUpiDetails) {
        return res.status(400).json({ message: 'This UPI ID already exists in our system' });
      }

      let upiQrCodeUrl = null;
      if (req.file) {
        const filename = `upi_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webp`;
        upiQrCodeUrl = await uploadToServerFast(req.file.buffer, filename, true);
      }

      const upiDetails = await RiderUpiDetails.create({
        riderId,
        paymentMethod: 'upi',
        upiId,
        upiQrCode: upiQrCodeUrl
      });

      return res.json({
        success: true,
        message: 'UPI details added successfully',
        data: upiDetails
      });
    }
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to add payment method' });
  }
});

// READ - Get all payment methods for a rider
router.get('/', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;

    const [bankDetails, upiDetails] = await Promise.all([
      RiderBankDetails.find({ riderId }).sort({ createdAt: -1 }),
      RiderUpiDetails.find({ riderId }).sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      data: {
        bankDetails: bankDetails.map(bank => ({
          ...bank.toObject(),
          paymentMethod: 'bank_transfer'
        })),
        upiDetails: upiDetails.map(upi => ({
          ...upi.toObject(),
          paymentMethod: 'upi'
        }))
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment methods' });
  }
});

// UPDATE - Update payment method (bank or UPI)
router.put('/', authMiddleware, upload.single('upiQrCode'), async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const { paymentDetailId, paymentMethod } = req.body;

    if (!paymentMethod || !['bank_transfer', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Valid paymentMethod (bank_transfer or upi) is required' });
    }

    if (paymentMethod === 'bank_transfer') {
      const { bankAccountHolderName, accountNumber, ifscCode, bankName } = req.body;

      const bankDetails = await RiderBankDetails.findOneAndUpdate(
        { _id: paymentDetailId, riderId },
        { bankAccountHolderName, accountNumber, ifscCode, bankName },
        { new: true }
      );

      if (!bankDetails) {
        return res.status(404).json({ message: 'Bank details not found' });
      }

      return res.json({
        success: true,
        message: 'Bank details updated successfully',
        data: bankDetails
      });
    }

    if (paymentMethod === 'upi') {
      const { upiId } = req.body;
      const updateData = { upiId };

      if (req.file) {
        const filename = `upi_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webp`;
        updateData.upiQrCode = await uploadToServerFast(req.file.buffer, filename, true);
      }

      const upiDetails = await RiderUpiDetails.findOneAndUpdate(
        { _id: paymentDetailId, riderId },
        { $set: updateData },
        { new: true, runValidators: true }
      );


      if (!upiDetails) {
        return res.status(404).json({ message: 'UPI details not found' });
      }

      return res.json({
        success: true,
        message: 'UPI details updated successfully',
        data: upiDetails
      });
    }
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment method' });
  }
});

// DELETE - Delete payment method (bank or UPI)
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;
    const { paymentDetailId, paymentMethod } = req.body;

    if (!paymentMethod || !['bank_transfer', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Valid paymentMethod (bank_transfer or upi) is required' });
    }

    if (paymentMethod === 'bank_transfer') {
      const bankDetails = await RiderBankDetails.findOneAndDelete({ _id: paymentDetailId, riderId });

      if (!bankDetails) {
        return res.status(404).json({ message: 'Bank details not found' });
      }

      return res.json({
        success: true,
        message: 'Bank details deleted successfully'
      });
    }

    if (paymentMethod === 'upi') {
      const upiDetails = await RiderUpiDetails.findOneAndDelete({ _id: paymentDetailId, riderId });

      if (!upiDetails) {
        return res.status(404).json({ message: 'UPI details not found' });
      }

      return res.json({
        success: true,
        message: 'UPI details deleted successfully'
      });
    }
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment method' });
  }
});

module.exports = router;