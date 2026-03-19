const express = require('express');
const router = express.Router();
const axios = require('axios');
const RideRescheduleService = require('../Services/rideRescheduleService');
const rideCostService = require('../Services/rideCostService');
const NotificationService = require('../Services/notificationService');
const authMiddleware = require('../middleware/authMiddleware');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const WHATSAPP_API_URL = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Reschedule ride
router.put('/reschedule', authMiddleware, async (req, res) => {
  try {

    const { rideId, selectedDate, selectedTime } = req.body;

    const Ride = require('../models/Ride');
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Prevent weekly/monthly reschedule
    const subcategoryName = ride.rideInfo?.subcategoryName?.toLowerCase() || '';

    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      return res.status(400).json({
        message: 'Weekly or monthly rides cannot be rescheduled'
      });
    }

    const Category = require('../models/Category');
    const category = await Category.findById(ride.rideInfo.categoryId);

    const categoryName = category?.name?.toLowerCase() || '';
    let cancellationBufferTime = 0;

    if (categoryName === 'cab') {

      const data = await rideCostService.getCabRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );

      cancellationBufferTime = data.cancellationBufferTime;

    } else if (categoryName === 'parcel') {

      const data = await rideCostService.getParcelRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );

      cancellationBufferTime = data.cancellationBufferTime;

    } else {

      const data = await rideCostService.getDriverRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );

      cancellationBufferTime = data.cancellationBufferTime;
    }

    const rideDateTime = new Date(`${ride.rideInfo.selectedDate.toISOString().split('T')[0]}T${ride.rideInfo.selectedTime}`);
    const currentDateTime = new Date();

    const timeDiffMinutes = (rideDateTime - currentDateTime) / (1000 * 60);

    if (timeDiffMinutes <= cancellationBufferTime) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule ride. Reschedule is not allowed within ${cancellationBufferTime} minutes of ride start time`
      });
    }

    let result;

    if (RideRescheduleService.canRescheduleDirectly(ride)) {

      result = await RideRescheduleService.rescheduleDirectly(rideId, {
        selectedDate,
        selectedTime
      });

    } else {

      result = await RideRescheduleService.sendRescheduleRequest(rideId, {
        selectedDate,
        selectedTime
      });

      // 🔔 Send OneSignal & WhatsApp to driver if assigned
      if (ride.driverId) {
        const Driver = require('../DriverModel/DriverModel');
        const driver = await Driver.findById(ride.driverId);

        if (driver) {
          // 📱 Send OneSignal notification
          try {
            if (driver.oneSignalPlayerId) {
              await NotificationService.sendAndStoreDriverNotification(
                driver._id,
                driver.oneSignalPlayerId,
                'Ride Reschedule Request',
                `Rider wants to reschedule ride to ${new Date(selectedDate).toLocaleDateString('en-GB')} at ${selectedTime}`,
                'reschedule_request',
                {
                  rideId,
                  selectedDate,
                  selectedTime,
                  action: 'reschedule_request'
                },
                ride.rideInfo.categoryId,
                rideId
              );
              console.log("✅ OneSignal RESCHEDULE REQUEST sent to driver");
            } else {
              console.log("⚠️ OneSignal SKIPPED - Driver playerId missing");
            }
          } catch (oneSignalError) {
            console.log("❌ OneSignal RESCHEDULE REQUEST FAILED:", oneSignalError.message);
          }

          // 📱 Send WhatsApp notification
          try {
            const mobileStr = driver.mobile;
            if (mobileStr) {
              const toNumber = mobileStr.startsWith('+') ? mobileStr : `91${mobileStr}`;
              const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN');

              const payload = {
                messaging_product: "whatsapp",
                to: toNumber,
                type: "template",
                template: {
                  name: "hire4drive_reschedule_request_driver",
                  language: { code: "en" },
                  components: [{
                    type: "body",
                    parameters: [
                      { type: "text", text: formattedDate },
                      { type: "text", text: selectedTime }
                    ]
                  }]
                }
              };

              const response = await axios.post(WHATSAPP_API_URL, payload, {
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  "Content-Type": "application/json"
                }
              });

              console.log("✅ WhatsApp RESCHEDULE REQUEST sent to driver");
            } else {
              console.log("⚠️ WhatsApp SKIPPED - Driver mobile missing");
            }
          } catch (whatsappError) {
            console.log("❌ WhatsApp RESCHEDULE REQUEST FAILED:", whatsappError.response?.data || whatsappError.message);
          }
        } else {
          console.log("⚠️ Notifications SKIPPED - Driver not found:", ride.driverId);
        }
      }

    }

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
});

// Driver response to reschedule request
router.put('/reschedule-response', driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, action } = req.body;
    const driverId = req.driver.id;

    const result = await RideRescheduleService.handleDriverResponse(rideId, action);

    // Get ride and related data for notifications
    const Ride = require('../models/Ride');
    const Driver = require('../DriverModel/DriverModel');
    const Rider = require('../models/Rider');
    
    const ride = await Ride.findById(rideId);
    const driver = await Driver.findById(driverId);
    const rider = await Rider.findById(ride?.riderId);

    if (!ride || !driver || !rider) {
      console.log("⚠️ Missing data - Ride:", !!ride, "Driver:", !!driver, "Rider:", !!rider);
      return res.json(result);
    }

    const selectedDateRaw = ride.rescheduleRequest?.requestedDate;
    const selectedTime = ride.rescheduleRequest?.requestedTime;
    const selectedDate = selectedDateRaw ? new Date(selectedDateRaw).toLocaleDateString("en-GB") : "N/A";

    if (action === "ACCEPTED") {
      // 📱 Send OneSignal notification to rider
      try {
        if (rider.oneSignalPlayerId) {
          await NotificationService.sendAndStoreRiderNotification(
            rider._id,
            rider.oneSignalPlayerId,
            'Reschedule Request Accepted',
            `Driver accepted your reschedule request for ${selectedDate} at ${selectedTime}`,
            'reschedule_accepted',
            {
              selectedDate: selectedDateRaw,
              selectedTime,
              rideId
            },
            ride.rideInfo.categoryId,
            rideId
          );
          console.log("✅ OneSignal RESCHEDULE ACCEPTED sent to rider");
        } else {
          console.log("⚠️ OneSignal SKIPPED - Rider playerId missing");
        }
      } catch (oneSignalError) {
        console.log("❌ OneSignal RESCHEDULE ACCEPTED FAILED:", oneSignalError.message);
      }

      // 📱 Send WhatsApp to rider
      try {
        const riderMobile = ride.riderInfo?.riderMobile;
        if (riderMobile) {
          const toNumber = riderMobile.startsWith("+") ? riderMobile : `91${riderMobile}`;

          const payload = {
            messaging_product: "whatsapp",
            to: toNumber,
            type: "template",
            template: {
              name: "hire4drive_reschedule_accepted_rider",
              language: { code: "en" },
              components: [{
                type: "body",
                parameters: [
                  { type: "text", text: selectedDate },
                  { type: "text", text: selectedTime || "N/A" }
                ]
              }]
            }
          };

          const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          });

          console.log("✅ WhatsApp RESCHEDULE ACCEPTED sent to rider");
        } else {
          console.log("⚠️ WhatsApp SKIPPED - Rider mobile missing");
        }
      } catch (whatsappError) {
        console.log("❌ WhatsApp RESCHEDULE ACCEPTED FAILED:", whatsappError.response?.data || whatsappError.message);
      }

    } else if (action === "REJECTED") {
      // 📱 Send OneSignal notification to rider
      try {
        if (rider.oneSignalPlayerId) {
          await NotificationService.sendAndStoreRiderNotification(
            rider._id,
            rider.oneSignalPlayerId,
            'Reschedule Request Rejected',
            `Driver rejected your reschedule request. A new ride has been created for ${selectedDate} at ${selectedTime}`,
            'reschedule_rejected',
            {
              selectedDate: selectedDateRaw,
              selectedTime,
              originalRideId: rideId,
              newRideId: result.newRide?._id
            },
            ride.rideInfo.categoryId,
            rideId
          );
          console.log("✅ OneSignal RESCHEDULE REJECTED sent to rider");
        } else {
          console.log("⚠️ OneSignal SKIPPED - Rider playerId missing");
        }
      } catch (oneSignalError) {
        console.log("❌ OneSignal RESCHEDULE REJECTED FAILED:", oneSignalError.message);
      }

      // 📱 Send WhatsApp to rider
      try {
        const riderMobile = ride.riderInfo?.riderMobile;
        if (riderMobile) {
          const toNumber = riderMobile.startsWith("+") ? riderMobile : `91${riderMobile}`;

          const payload = {
            messaging_product: "whatsapp",
            to: toNumber,
            type: "template",
            template: {
              name: "hire4drive_reschedule_rejected_rider", // You'll need this template
              language: { code: "en" },
              components: [{
                type: "body",
                parameters: [
                  { type: "text", text: selectedDate },
                  { type: "text", text: selectedTime || "N/A" }
                ]
              }]
            }
          };

          const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          });

          console.log("✅ WhatsApp RESCHEDULE REJECTED sent to rider");
        } else {
          console.log("⚠️ WhatsApp SKIPPED - Rider mobile missing");
        }
      } catch (whatsappError) {
        console.log("❌ WhatsApp RESCHEDULE REJECTED FAILED:", whatsappError.response?.data || whatsappError.message);
      }
    }

    return res.json(result);

  } catch (error) {
    console.error("❌ Reschedule response error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;