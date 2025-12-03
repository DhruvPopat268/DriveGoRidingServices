const { client } = require('../config/oneSignalConfig');
const DriverNotification = require('../DriverModel/DriverNotification');

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
      return { success: true, response };
    } catch (error) {
      console.error('OneSignal notification error:', error);
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
      console.error('OneSignal notification error:', error);
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
      console.error('OneSignal notification error:', error);
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
      console.error('OneSignal notification error:', error);
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
  static async storeDriverNotification(driverId, title, message, type, data = {}) {
    try {
      await DriverNotification.create({
        driverId,
        title,
        message,
        type,
        data
      });
    } catch (error) {
      console.error('Error storing driver notification:', error);
    }
  }

  // Send notification to driver and store in database
  static async sendAndStoreDriverNotification(driverId, playerId, title, message, type, data = {}) {
    try {
      // Send push notification if playerId exists
      if (playerId) {
        await this.sendToUser(playerId, title, message, { type, ...data });
      }
      
      // Store in database
      await this.storeDriverNotification(driverId, title, message, type, data);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending and storing driver notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;