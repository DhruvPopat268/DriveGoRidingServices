# Paise Conversion Summary

## Overview
Updated the wallet and payment system to store all monetary amounts in paise (smallest currency unit) instead of rupees for better precision and consistency.

## Files Modified

### 1. Models Updated

#### `backend/models/Wallet.js`
- Updated `balance`, `totalDeposited`, and `totalSpent` fields to store amounts in paise
- Added comments indicating amounts are stored in paise

#### `backend/models/Payment.js`
- Already storing amounts in paise (no changes needed)
- Confirmed amount field stores values in paise with proper validation

#### `backend/models/Ride.js`
- Updated all monetary fields in `rideInfo` to store amounts in paise:
  - `insuranceCharges`, `cancellationCharges`, `discount`, `gstCharges`, `subtotal`, `adminCharges`
- Updated `referralBalance` and `totalPayable` to store amounts in paise
- Added comments indicating amounts are stored in paise

#### `backend/models/RideCost.js`
- Updated all monetary fields to store amounts in paise:
  - `chargePerKm`, `chargePerMinute`, `pickCharges`, `nightCharges`, `cancellationFee`, `insurance`, `discount`, `minimumFare`
- Added comments indicating amounts are stored in paise

### 2. Routes Updated

#### `backend/routes/Payment&Wallet.js`
- Updated validation to expect amounts in paise (100-5000000 instead of 1-50000)
- Removed conversion from INR to paise in wallet operations
- Updated wallet balance operations to work directly with paise
- Updated payment history response to return amounts in paise
- Updated wallet details response to return amounts in paise
- Updated deduct operation to work with paise
- Updated webhook handlers to work with paise

#### `backend/routes/rideCostRoutes.js`
- Updated calculation endpoint to work with amounts in paise
- Added comments indicating returned amounts are in paise

## Important Notes

### For Frontend Integration
1. **All API responses now return amounts in paise**
2. **All API requests should send amounts in paise**
3. **Frontend should convert paise to rupees for display**: `amount_in_rupees = amount_in_paise / 100`
4. **Frontend should convert rupees to paise before sending**: `amount_in_paise = amount_in_rupees * 100`

### Database Migration
- Existing data in the database may need migration if it was stored in rupees
- Consider running a migration script to convert existing wallet balances from rupees to paise
- Multiply existing amounts by 100 to convert from rupees to paise

### API Changes
- **Wallet balance**: Now returned in paise
- **Payment amounts**: Already in paise (no change)
- **Ride costs**: Now calculated and returned in paise
- **Transaction amounts**: Now stored and returned in paise

### Validation Updates
- Minimum wallet recharge: 100 paise (₹1)
- Maximum wallet recharge: 5,000,000 paise (₹50,000)

## Benefits
1. **Precision**: No floating-point arithmetic issues with currency
2. **Consistency**: All monetary values stored in the same unit
3. **Razorpay Compatibility**: Razorpay already works with paise
4. **Database Efficiency**: Integer storage is more efficient than decimal