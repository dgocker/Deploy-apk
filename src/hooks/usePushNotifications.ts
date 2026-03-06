import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import { getApiUrl } from '../utils/api';

export function usePushNotifications() {
  const { token } = useStore();

  useEffect(() => {
    if (!token) return;

    const registerPush = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications are only available on native platforms');
        return;
      }

      try {
        // Request permission to use push notifications
        // iOS will prompt user and return if they granted permission or not
        // Android will just grant without prompting
        const permStatus = await PushNotifications.requestPermissions();

        if (permStatus.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          await PushNotifications.register();
        } else {
          console.warn('User denied push notification permission');
        }
      } catch (error) {
        console.error('Error requesting push notification permissions:', error);
      }
    };

    registerPush();

    // On success, we should be able to receive notifications
    const registrationListener = PushNotifications.addListener('registration', async (tokenData) => {
      console.log('Push registration success, token: ' + tokenData.value);
      
      // Send the token to the backend
      try {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/auth/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fcmToken: tokenData.value }),
        });
        console.log('Successfully sent FCM token to backend');
      } catch (error) {
        console.error('Failed to send FCM token to backend:', error);
      }
    });

    // Some issue with our setup and push will not work
    const errorListener = PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    const pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // If it's an incoming call, the socket should also receive the 'call_incoming' event.
      // If the socket is disconnected, we might need to reconnect it or show a local UI.
      // For now, the socket auto-reconnects and handles 'call_incoming'.
    });

    // Method called when tapping on a notification
    const pushActionPerformedListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Navigate to the app or specific screen if needed
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      pushReceivedListener.then(l => l.remove());
      pushActionPerformedListener.then(l => l.remove());
    };
  }, [token]);
}
