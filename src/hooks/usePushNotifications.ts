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
          
          // Create a high-priority channel for calls (Android 8+)
          if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
              id: 'calls',
              name: 'Входящие звонки',
              description: 'Уведомления о входящих видеозвонках',
              importance: 5, // 5 = MAX (Heads-up notification, wakes screen)
              visibility: 1, // 1 = PUBLIC (Shows on lock screen)
              sound: 'ringtone', // Uses default ringtone or custom if provided
              vibration: true,
              lights: true,
              lightColor: '#10B981', // Emerald 500
            });
          }
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
      
      // If it's an incoming call, store it in the pendingCall state
      if (notification.data && notification.data.type === 'incoming_call') {
        console.log('Incoming call push received, storing in pendingCall');
        useStore.getState().setPendingCall(notification.data);
      }
    });

    // Method called when tapping on a notification
    const pushActionPerformedListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      
      // If it's an incoming call, store it in the pendingCall state
      if (notification.notification.data && notification.notification.data.type === 'incoming_call') {
        console.log('Incoming call push performed, storing in pendingCall');
        useStore.getState().setPendingCall(notification.notification.data);
      }
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      pushReceivedListener.then(l => l.remove());
      pushActionPerformedListener.then(l => l.remove());
    };
  }, [token]);
}
