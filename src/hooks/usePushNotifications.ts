import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { CallKitVoip } from '@techrover_solutions/capacitor-callkit-voip';
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
        // 1. Check permissions first
        let permStatus = await PushNotifications.checkPermissions();
        console.log('Push permission status:', permStatus.receive);

        // 2. Request if not granted
        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
          console.log('Requested push permission:', permStatus.receive);
        }

        if (permStatus.receive === 'granted') {
          // 3. Register with Apple / Google to receive push via APNS/FCM
          await PushNotifications.register();
          
          // 4. Create a high-priority channel for calls (Android 8+)
          if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
              id: 'call_channel',
              name: 'Входящие звонки',
              description: 'Уведомления о входящих видеозвонках',
              importance: 5, // 5 = MAX (Heads-up notification, wakes screen)
              visibility: 1, // 1 = PUBLIC (Shows on lock screen)
              sound: 'ringtone', // Custom ringtone
              vibration: true,
              lights: true,
              lightColor: '#10B981', // Emerald 500
              // @ts-ignore
              category: 'call'
            });
            console.log('Channel "call_channel" created successfully');
          }
        } else {
          console.warn('User denied push notification permission - POST_NOTIFICATIONS denied');
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

    // Listen for VoIP calls (CallKit)
    const callListener = (CallKitVoip as any).addListener('incomingCall', (call: any) => {
      console.log('Incoming VoIP call received:', call);
      // Trigger ringing screen
      // The plugin should handle the native UI, but we need to update our app state
      // to show the call screen when the user answers or opens the app
      if (call.data) {
         useStore.getState().setPendingCall(call.data);
      } else {
         // Fallback using available info
         useStore.getState().setPendingCall({
             from: call.callerId,
             name: call.callerName || 'Unknown',
             type: 'incoming_call'
         });
      }
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      pushReceivedListener.then(l => l.remove());
      pushActionPerformedListener.then(l => l.remove());
      callListener.then(l => l.remove());
    };
  }, [token]);
}

