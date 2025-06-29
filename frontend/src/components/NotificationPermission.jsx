import React, { useState, useEffect } from "react";
import { registerPushSubscription } from "../services/api";

// Utility function for converting VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState(
    Notification.permission
  );
  const [subscriptionSent, setSubscriptionSent] = useState(false);

  useEffect(() => {
    // Initial check on mount
    setPermissionStatus(Notification.permission);
    // Check if subscription was already sent (e.g., from local storage or service worker state)
    // For this example, we'll assume it needs to be sent on every grant or after a successful permission request
  }, []);

  const subscribeUser = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!VAPID_PUBLIC_KEY) {
          console.error(
            "VAPID Public Key is not defined in environment variables."
          );
          alert("Push notifications are not configured.");
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        console.log("Push Subscription:", pushSubscription);

        // Send subscription to your backend
        await registerPushSubscription(pushSubscription);
        setSubscriptionSent(true);
        console.log("Push subscription registered with backend.");
      } catch (error) {
        console.error("Failed to subscribe user:", error);
        alert("Failed to subscribe to push notifications.");
      }
    } else {
      console.warn("Service Worker not supported.");
      alert("Push notifications are not supported in this browser.");
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === "granted") {
      console.log("Notification permission granted, attempting to subscribe.");
      await subscribeUser();
    } else {
      console.log("Notification permission denied or dismissed.");
    }
  };

  const renderButton = () => {
    if (permissionStatus === "granted") {
      return (
        <p>Notifications are enabled.{subscriptionSent && " (Subscribed)"}</p>
      );
    } else if (permissionStatus === "denied") {
      return (
        <p>
          Notifications are blocked. Please enable them in your browser
          settings.
        </p>
      );
    } else {
      // 'default'
      return <button onClick={requestPermission}>Enable Notifications</button>;
    }
  };

  return (
    <div>
      <h2>Notification Settings</h2>
      {renderButton()}
    </div>
  );
};

export default NotificationPermission;
