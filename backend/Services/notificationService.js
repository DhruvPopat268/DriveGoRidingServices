const { client } = require('../config/oneSignalConfig');

class NotificationService {
  // Send notification to specific user by player ID
  static async sendToUser(playerId, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_player_ids: [playerId],
        data: data
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
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_player_ids: playerIds,
        data: data
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
}

module.exports = NotificationService;