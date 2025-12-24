const Ride = require('../models/Ride');
const Driver = require('../DriverModel/DriverModel');
const NotificationService = require('./notificationService');

class RideRescheduleService {
  
  // Check if ride can be rescheduled directly (before driver confirmation)
  static canRescheduleDirectly(ride) {
    return ride.status === 'BOOKED' && !ride.driverId && ride.rescheduleRequest?.status !== 'PENDING';
  }

  // Reschedule ride directly (before driver confirmation)
  static async rescheduleDirectly(rideId, { selectedDate, selectedTime }) {
    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    if (!this.canRescheduleDirectly(ride)) {
      throw new Error('Cannot reschedule ride directly');
    }

    ride.rideInfo.selectedDate = selectedDate;
    ride.rideInfo.selectedTime = selectedTime;
    await ride.save();

    return { success: true, ride, message: 'Ride rescheduled successfully' };
  }

  // Send reschedule request to driver (after driver confirmation)
  static async sendRescheduleRequest(rideId, { selectedDate, selectedTime }) {
    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    if (!ride.driverId) {
      throw new Error('No driver assigned to this ride');
    }

    if (ride.rescheduleRequest?.status === 'PENDING') {
      throw new Error('Reschedule request already pending');
    }

    const driver = await Driver.findById(ride.driverId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Update ride with reschedule request
    ride.rescheduleRequest = {
      status: 'PENDING',
      requestedDate: selectedDate,
      requestedTime: selectedTime,
      requestedAt: new Date()
    };
    await ride.save();

    // Add to driver's pending requests
    driver.pendingRescheduleRequests.push({
      rideId,
      status: 'PENDING',
      requestedDate: selectedDate,
      requestedTime: selectedTime
    });
    await driver.save();

    // Send notification to driver
    await NotificationService.sendRescheduleNotification(driver, ride, {
      selectedDate,
      selectedTime
    });

    return { 
      success: true, 
      message: 'Reschedule request sent to driver',
      status: 'PENDING'
    };
  }

  // Handle driver's response to reschedule request
  static async handleDriverResponse(rideId, action) {
    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    if (!ride.rescheduleRequest?.status || ride.rescheduleRequest.status !== 'PENDING') {
      throw new Error('No pending reschedule request found');
    }

    const { requestedDate, requestedTime } = ride.rescheduleRequest;

    if (action === 'accept') {
      return await this.acceptReschedule(ride, { selectedDate: requestedDate, selectedTime: requestedTime });
    } else if (action === 'reject') {
      return await this.rejectReschedule(ride, { selectedDate: requestedDate, selectedTime: requestedTime });
    } else {
      throw new Error('Invalid action');
    }
  }

  // Accept reschedule request
  static async acceptReschedule(ride, { selectedDate, selectedTime }) {
    ride.rideInfo.selectedDate = selectedDate;
    ride.rideInfo.selectedTime = selectedTime;
    ride.rescheduleRequest.status = 'ACCEPTED';
    ride.rescheduleRequest.respondedAt = new Date();
    await ride.save();

    // Update driver's request status
    await Driver.updateOne(
      { _id: ride.driverId, 'pendingRescheduleRequests.rideId': ride._id },
      { 
        $set: { 
          'pendingRescheduleRequests.$.status': 'ACCEPTED',
          'pendingRescheduleRequests.$.respondedAt': new Date()
        }
      }
    );

    // Send notification to rider about acceptance
    try {
      const Rider = require('../models/Rider');
      const rider = await Rider.findById(ride.riderId);
      const driver = await Driver.findById(ride.driverId);
      
      if (rider && driver) {
        await NotificationService.sendRescheduleAcceptedNotification(rider, driver, {
          selectedDate,
          selectedTime
        });
      }
    } catch (notifError) {
      console.error('Error sending acceptance notification:', notifError);
    }

    return { 
      success: true, 
      message: 'Reschedule request accepted',
      status: 'ACCEPTED',
      ride 
    };
  }

  // Reject reschedule request - create new ride and cancel original
  static async rejectReschedule(ride, { selectedDate, selectedTime }) {
    // Update driver status to WAITING
    if (ride.driverId) {
      await Driver.findByIdAndUpdate(ride.driverId, { rideStatus: 'WAITING' });
    }

    // Create new ride with same data but new date/time
    const newRideData = {
      ...ride.toObject(),
      _id: undefined,
      status: 'BOOKED',
      driverId: null,
      driverInfo: {},
      rescheduleRequest: { status: null },
      createdAt: undefined,
      updatedAt: undefined
    };

    // Update the new ride's date and time
    newRideData.rideInfo.selectedDate = selectedDate;
    newRideData.rideInfo.selectedTime = selectedTime;

    const newRide = new Ride(newRideData);
    await newRide.save();

    // Update original ride status
    ride.status = 'CANCELLED';
    ride.cancellationReason = 'Driver rejected reschedule request';
    ride.whoCancel = 'Driver';
    ride.rescheduleRequest.status = 'REJECTED';
    ride.rescheduleRequest.respondedAt = new Date();
    await ride.save();

    // Update driver's request status
    await Driver.updateOne(
      { _id: ride.driverId, 'pendingRescheduleRequests.rideId': ride._id },
      { 
        $set: { 
          'pendingRescheduleRequests.$.status': 'REJECTED',
          'pendingRescheduleRequests.$.respondedAt': new Date()
        }
      }
    );

    // Emit new-ride event to eligible drivers
    await this.emitNewRideEvent(newRide);

    return { 
      success: true, 
      message: 'New ride created, original ride cancelled',
      status: 'REJECTED',
      newRide,
      cancelledRide: ride
    };
  }

  // Helper method to emit new-ride event
  static async emitNewRideEvent(newRide) {
    try {
      // Get app instance to access io and onlineDrivers
      const app = require('../index');
      const io = app.get('io');
      const onlineDrivers = app.get('onlineDrivers');

      if (!io || !onlineDrivers) return;

      const rideData = {
        rideId: newRide._id,
        categoryName: newRide.rideInfo.categoryName,
        subcategoryName: newRide.rideInfo.subcategoryName,
        subSubcategoryName: newRide.rideInfo.subSubcategoryName,
        carType: newRide.rideInfo.carType,
        selectedCategory: newRide.rideInfo.selectedCategory,
        transmissionType: newRide.rideInfo.transmissionType,
        selectedUsage: newRide.rideInfo.selectedUsage,
        fromLocation: newRide.rideInfo.fromLocation,
        toLocation: newRide.rideInfo.toLocation,
        selectedDate: newRide.rideInfo.selectedDate,
        selectedTime: newRide.rideInfo.selectedTime,
        totalPayable: newRide.totalPayable,
        status: 'BOOKED'
      };

      // Get eligible drivers
      const { categoryId, subcategoryId, selectedCategoryId, categoryName } = newRide.rideInfo;
      const categoryNameLower = categoryName.toLowerCase();
      let waitingDrivers = [];

      if (categoryNameLower === 'driver') {
        waitingDrivers = await Driver.find({
          rideStatus: 'WAITING',
          isOnline: true,
          status: 'Approved',
          'personalInformation.category': categoryId,
          'personalInformation.subCategory': { $in: [subcategoryId] },
          driverCategory: selectedCategoryId
        }).select('_id oneSignalPlayerId');
      } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
        const Vehicle = require('../DriverModel/VehicleModel');
        const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';

        const vehicles = await Vehicle.find({
          [vehicleField]: selectedCategoryId,
          status: true,
          adminStatus: 'approved'
        }).select('assignedTo');

        const assignedDriverIds = vehicles.flatMap(vehicle => vehicle.assignedTo);

        if (assignedDriverIds.length > 0) {
          waitingDrivers = await Driver.find({
            _id: { $in: assignedDriverIds },
            rideStatus: 'WAITING',
            isOnline: true,
            status: 'Approved',
            'personalInformation.category': categoryId,
            'personalInformation.subCategory': { $in: [subcategoryId] },
            ownership: { $ne: 'Owner' }
          }).select('_id oneSignalPlayerId');
        }
      }

      const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());

      // Send socket events to online eligible drivers
      let sentCount = 0;
      Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
        if (waitingDriverIds.includes(driverId)) {
          io.to(driverSocketData.socketId).emit('new-ride', rideData);
          sentCount++;
        }
      });

      // Send push notifications to eligible drivers
      const eligibleDrivers = waitingDrivers.filter(driver => driver.oneSignalPlayerId);
      
      if (eligibleDrivers.length > 0) {
        const playerIds = eligibleDrivers.map(driver => driver.oneSignalPlayerId);
        
        // Format date and time for notification
        const dateObj = new Date(newRide.rideInfo.selectedDate);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear()).slice(-2);
        const formattedDate = `${day}/${month}/${year}`;
        
        const formatTo12Hour = (time24) => {
          const [hours, minutes] = time24.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        };
        const formattedTime = formatTo12Hour(newRide.rideInfo.selectedTime);
        
        const message = `New ${newRide.rideInfo.subcategoryName} ride available for ${formattedDate} at ${formattedTime}`;
        
        await NotificationService.sendToMultipleUsers(
          playerIds,
          'New Ride Available',
          message
        );
        
        console.log(`📱 Push notification sent to ${playerIds.length} eligible drivers`);
      }

      console.log(`🚗 New reschedule ride ${newRide._id} sent to ${sentCount} available drivers`);
    } catch (error) {
      console.error('Error emitting new-ride event:', error);
    }
  }
}

module.exports = RideRescheduleService;