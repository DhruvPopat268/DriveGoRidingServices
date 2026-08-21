const { client } = require('../config/oneSignalConfig');
const DriverNotification = require('../DriverModel/DriverNotification');
const RiderNotification = require('../models/RiderNotification');

class NotificationService {
  // Send notification to specific user by player ID
  static async sendToUser(playerId, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_player_ids: [playerId],
        data: data,
        content_available: true,
        mutable_content: true
      };

      const response = await client.createNotification(notification);
      
      // Check for subscription errors
      if (response.body && response.body.errors && response.body.errors.includes('All included players are not subscribed')) {
        return { success: false, error: 'Player not subscribed', playerId };
      }
      
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple users
  static async sendToMultipleUsers(playerIds, title, message, data = {}) {
    try {
      // Encode data in message for free OneSignal accounts
      const encodedMessage = data && Object.keys(data).length > 0
        ? `${message}|DATA:${JSON.stringify(data)}`
        : message;

      const notification = {
        contents: { en: encodedMessage },
        headings: { en: title },
        include_player_ids: playerIds
      };

      const response = await client.createNotification(notification);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send notification by external user ID (your app's user ID)
  static async sendToExternalUserId(externalUserId, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_external_user_ids: [externalUserId],
        data: data
      };

      const response = await client.createNotification(notification);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send notification to all users with specific tags
  static async sendToUsersByTag(tagKey, tagValue, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        filters: [
          { field: 'tag', key: tagKey, relation: '=', value: tagValue }
        ],
        data: data
      };

      const response = await client.createNotification(notification);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Ride-specific notifications
  static async notifyRideRequest(driverPlayerId, rideDetails) {
    return await this.sendToUser(
      driverPlayerId,
      'New Ride Request',
      `New ride request from ${rideDetails.pickup} to ${rideDetails.destination}`,
      { type: 'ride_request', rideId: rideDetails.rideId }
    );
  }

  static async notifyRideAccepted(passengerPlayerId, driverDetails) {
    return await this.sendToUser(
      passengerPlayerId,
      'Ride Accepted',
      `${driverDetails.name} accepted your ride request`,
      { type: 'ride_accepted', driverId: driverDetails.driverId }
    );
  }

  static async notifyDriverArrived(passengerPlayerId, driverDetails) {
    return await this.sendToUser(
      passengerPlayerId,
      'Driver Arrived',
      `${driverDetails.name} has arrived at pickup location`,
      { type: 'driver_arrived', driverId: driverDetails.driverId }
    );
  }

  static async notifyTripStarted(passengerPlayerId, tripDetails) {
    return await this.sendToUser(
      passengerPlayerId,
      'Trip Started',
      'Your trip has started',
      { type: 'trip_started', tripId: tripDetails.tripId }
    );
  }

  static async notifyTripCompleted(playerIds, tripDetails) {
    return await this.sendToMultipleUsers(
      playerIds,
      'Trip Completed',
      'Your trip has been completed successfully',
      { type: 'trip_completed', tripId: tripDetails.tripId }
    );
  }

  // Store notification in database for driver
  static async storeDriverNotification(driverId, title, message, type, data = {}, categoryId = null, rideId = null) {
    try {
      const notification = await DriverNotification.create({
        driverId,
        categoryId,
        rideId,
        title,
        message,
        type,
        data
      });
    } catch (error) {
    }
  }

  // Send notification to driver and store in database
  static async sendAndStoreDriverNotification(driverId, playerId, title, message, type, data = {}, categoryId = null, rideId = null) {
    try {
      // Send push notification if playerId exists
      if (playerId) {
        const result = await this.sendToUser(playerId, title, message, { type, ...data });
      } else {
      }

      // Store in database
      await this.storeDriverNotification(driverId, title, message, type, data, categoryId, rideId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store notification in database for rider
  static async storeRiderNotification(riderId, title, message, type, data = {}, categoryId = null, rideId = null) {
    try {
      const notification = await RiderNotification.create({
        riderId,
        title,
        message,
        categoryId,
        rideId,
        type,
        data
      });
    } catch (error) {
    }
  }

  // Send notification to rider and store in database
  static async sendAndStoreRiderNotification(riderId, playerId, title, message, type, data = {}, categoryId = null, rideId = null) {
    try {
      // Send push notification if playerId exists
      if (playerId) {
        const result = await this.sendToUser(playerId, title, message, { type, ...data });
      } else {
      }

      // Store in database
      await this.storeRiderNotification(riderId, title, message, type, data, categoryId, rideId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send reschedule notification to driver
  static async sendRescheduleNotification(driver, ride, rescheduleData) {
    const { selectedDate, selectedTime } = rescheduleData;
    
    // Format date to dd/mm/yy
    const dateObj = new Date(selectedDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const formattedDate = `${day}/${month}/${year}`;
    
    // Format time to 12-hour format with AM/PM
    const formatTo12Hour = (time24) => {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    const formattedTime = formatTo12Hour(selectedTime);
    
    const title = 'Ride Reschedule Request';
    const message = `Rider wants to reschedule ride to ${formattedDate} at ${formattedTime}`;
    
    return await this.sendAndStoreDriverNotification(
      driver._id,
      driver.oneSignalPlayerId,
      title,
      message,
      'reschedule_request',
      {
        rideId: ride._id,
        selectedDate,
        selectedTime,
        action: 'reschedule_request'
      },
      null,
      ride._id
    );
  }

  // Send reschedule accepted notification to rider
  static async sendRescheduleAcceptedNotification(rider, driver, rescheduleData) {
    const { selectedDate, selectedTime } = rescheduleData;
    
    // Format date to dd/mm/yy
    const dateObj = new Date(selectedDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const formattedDate = `${day}/${month}/${year}`;
    
    // Format time to 12-hour format with AM/PM
    const formatTo12Hour = (time24) => {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    const formattedTime = formatTo12Hour(selectedTime);
    
    const driverName = driver.personalInformation?.fullName || 'Your driver';
    const title = 'Reschedule Request Accepted';
    const message = `${driverName} accepted your reschedule request. New ride time: ${formattedDate} at ${formattedTime}`;
    
    return await this.sendAndStoreRiderNotification(
      rider._id,
      rider.oneSignalPlayerId,
      title,
      message,
      'reschedule_accepted',
      {
        selectedDate,
        selectedTime,
        driverName
      },
      null,
      rescheduleData.rideId || null
    );
  }
}

module.exports = NotificationService;