const webpush = require("web-push");

// Set your VAPID keys here
const publicVapidKey =
  "BBPhIri8GeW32CQ8X7YSxXFpYzZngzk5SYlQIc2vvFuVLNtPDx4yoRwvmQn3EHxi1jHIKZLdOGSAAXK9jANI8Tg";
const privateVapidKey = "a7KQDkqBWHVowOymrX9QwFP_aRMcbBJ1lfEa4g0QAko";

webpush.setVapidDetails(
  "mailto:example@example.com",
  publicVapidKey,
  privateVapidKey
);

const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("Push notification sent successfully.");
  } catch (error) {
    console.error("Error sending push notification:", error);
    // You might want to handle common errors like Gone (410) for expired subscriptions
    if (error.statusCode === 410) {
      // Remove subscription from your database if it's expired
      console.log("Subscription is expired or no longer valid:", subscription);
    }
  }
};

module.exports = {
  sendPushNotification,
  publicVapidKey, // Export public key for frontend use
};
