import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initializePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only supported on native platforms');
    return;
  }

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    } else {
      console.log('Push notification permission denied');
    }

    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would send the token to your backend
      // Example:
      // fetch('/api/device-token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token: token.value })
      // });
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // Handle incoming call logic here if payload indicates a call
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Handle tap on notification
    });
  } catch (e) {
    console.error('Error initializing push notifications', e);
  }
};
