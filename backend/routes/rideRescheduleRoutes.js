const express = require('express');
const router = express.Router();
const RideRescheduleService = require('../Services/rideRescheduleService');
const rideCostService = require('../Services/rideCostService');
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

      // 🔔 Send WhatsApp to driver if assigned
      if (ride.driverId) {
        try {
          const Driver = require('../models/Driver');
          const driver = await Driver.findById(ride.driverId);

          if (!driver) {
            console.log("⚠️ WhatsApp SKIPPED - Driver not found:", ride.driverId);
            return;
          }

          const mobileStr = driver.mobile;

          if (!mobileStr) {
            console.log("⚠️ WhatsApp SKIPPED - Driver mobile missing");
            return;
          }

          const toNumber = mobileStr.startsWith('+')
            ? mobileStr
            : `91${mobileStr}`;

          const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN');

          console.log("📤 Sending RESCHEDULE REQUEST WhatsApp");
          console.log("📄 Template:", "hire4drive_reschedule_request_driver");
          console.log("📅 Date:", formattedDate);
          console.log("⏰ Time:", selectedTime);
          console.log("📱 To:", toNumber);

          const payload = {
            messaging_product: "whatsapp",
            to: toNumber,
            type: "template",
            template: {
              name: "hire4drive_reschedule_request_driver",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: formattedDate },
                    { type: "text", text: selectedTime }
                  ]
                }
              ]
            }
          };

          const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          });

          // ✅ SUCCESS
          console.log("✅ WhatsApp RESCHEDULE REQUEST SENT");
          console.log("📨 Response:", response.data);

        } catch (whatsappError) {

          console.log("❌ WhatsApp RESCHEDULE REQUEST FAILED");

          if (whatsappError.response) {
            console.log("🔴 Status:", whatsappError.response.status);
            console.log("🔴 Error Data:", whatsappError.response.data);
            console.log(
              "🔴 Error Message:",
              whatsappError.response?.data?.error?.message
            );
          } else if (whatsappError.request) {
            console.log("🟠 No response from WhatsApp API");
          } else {
            console.log("⚠️ Error:", whatsappError.message);
          }

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

    const result = await RideRescheduleService.handleDriverResponse(rideId, action);

    // 🟢 Send WhatsApp if reschedule accepted
    if (action === "ACCEPTED") {
      try {
        const ride = await Ride.findById(rideId);

        if (!ride) {
          console.log("⚠️ WhatsApp SKIPPED - Ride not found:", rideId);
          return;
        }

        const riderMobile = ride.riderInfo?.riderMobile;

        if (!riderMobile) {
          console.log("⚠️ WhatsApp SKIPPED - Rider mobile missing");
          return;
        }

        const toNumber = riderMobile.startsWith("+")
          ? riderMobile
          : `91${riderMobile}`;

        const selectedDateRaw = ride.rescheduleRequest?.requestedDate;
        const selectedTime = ride.rescheduleRequest?.requestedTime;

        const selectedDate = selectedDateRaw
          ? new Date(selectedDateRaw).toLocaleDateString("en-GB")
          : "N/A";

        console.log("📤 Sending RESCHEDULE ACCEPTED WhatsApp");
        console.log("📄 Template:", "hire4drive_reschedule_accepted_rider");
        console.log("📅 Date:", selectedDate);
        console.log("⏰ Time:", selectedTime);
        console.log("📱 To:", toNumber);

        const payload = {
          messaging_product: "whatsapp",
          to: toNumber,
          type: "template",
          template: {
            name: "hire4drive_reschedule_accepted_rider",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: selectedDate },
                  { type: "text", text: selectedTime || "N/A" }
                ]
              }
            ]
          }
        };

        const response = await axios.post(WHATSAPP_API_URL, payload, {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        });

        // ✅ SUCCESS
        console.log("✅ WhatsApp RESCHEDULE ACCEPTED SENT");
        console.log("📨 Response:", response.data);

      } catch (whatsappError) {

        console.log("❌ WhatsApp RESCHEDULE ACCEPTED FAILED");

        if (whatsappError.response) {
          console.log("🔴 Status:", whatsappError.response.status);
          console.log("🔴 Error Data:", whatsappError.response.data);
          console.log(
            "🔴 Error Message:",
            whatsappError.response?.data?.error?.message
          );
        } else if (whatsappError.request) {
          console.log("🟠 No response from WhatsApp API");
        } else {
          console.log("⚠️ Error:", whatsappError.message);
        }

      }
    }

    return res.json(result);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }
});

module.exports = router;