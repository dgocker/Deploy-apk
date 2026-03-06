import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { CallKitVoip } from '@techrover_solutions/capacitor-callkit-voip';
import { useStore } from '../store/useStore';
import { getApiUrl } from '../utils/api';

// Simple UUID generator for browser/client side if crypto.randomUUID is not available
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
    const pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      
      // If it's an incoming call, store it in the pendingCall state
      if (notification.data && notification.data.type === 'incoming_call') {
        console.log('Incoming call push received, storing in pendingCall');
        useStore.getState().setPendingCall(notification.data);

        // Report to CallKit
        try {
          await (CallKitVoip as any).reportNewIncomingCall({
            callId: notification.data.callId || generateUUID(),
            callerName: notification.data.callerName || notification.data.name || 'Unknown',
            handle: notification.data.callerId || notification.data.from || 'Unknown',
            hasVideo: notification.data.isVideo === 'true' || notification.data.isVideo === true
          });
        } catch (e) {
          console.error('Error reporting incoming call to CallKit:', e);
        }
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
      console.log('Incoming VoIP call received (CallKit event):', call);
      // Trigger ringing screen
      if (call.data) {
         useStore.getState().setPendingCall(call.data);
      } else {
         // Fallback using available info
         useStore.getState().setPendingCall({
             from: call.handle || call.callerId,
             name: call.callerName || 'Unknown',
             type: 'incoming_call',
             callId: call.callId
         });
      }
    });

    const answerListener = (CallKitVoip as any).addListener('answerCall', (call: any) => {
        console.log('Call answered via CallKit UI:', call);
        // Here we should probably navigate to the call screen or emit 'answer_call' socket event if we had access to socket
        // Since we don't have socket here, we rely on the UI component (Dashboard) to pick up the state change
        // or we can set a flag in the store
        useStore.getState().setPendingCall({
            ...useStore.getState().pendingCall,
            answered: true
        });
    });

    const endListener = (CallKitVoip as any).addListener('endCall', (call: any) => {
        console.log('Call ended via CallKit UI:', call);
        useStore.getState().setPendingCall(null);
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      pushReceivedListener.then(l => l.remove());
      pushActionPerformedListener.then(l => l.remove());
      callListener.then(l => l.remove());
      answerListener.then(l => l.remove());
      endListener.then(l => l.remove());
    };
  }, [token]);
}

