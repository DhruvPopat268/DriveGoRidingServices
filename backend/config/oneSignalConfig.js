const OneSignal = require('onesignal-node');

// OneSignal Configuration
const oneSignalConfig = {
  appId: process.env.ONESIGNAL_APP_ID,
  restApiKey: process.env.ONESIGNAL_REST_API_KEY,
  userAuthKey: process.env.ONESIGNAL_USER_AUTH_KEY // Optional
};

// Initialize OneSignal client
const client = new OneSignal.Client(oneSignalConfig.appId, oneSignalConfig.restApiKey);

module.exports = {
  client,
  oneSignalConfig
};