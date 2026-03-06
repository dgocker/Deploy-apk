import admin from 'firebase-admin';

export function initFirebaseAdmin() {
  try {
    const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
    
    if (!credentialsJson) {
      console.warn('FIREBASE_ADMIN_CREDENTIALS environment variable is not set. Push notifications will be disabled.');
      return;
    }

    const serviceAccount = JSON.parse(credentialsJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export async function sendPushNotification(fcmToken: string, title: string, body: string, data?: any) {
  if (!admin.apps.length) {
    console.warn('Firebase Admin is not initialized. Cannot send push notification.');
    return;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'calls', // Important for Android 8+ to wake up the app
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
