import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

export function initFirebaseAdmin() {
  try {
    let serviceAccount;

    // Method 1: Base64 encoded JSON in environment variable (Render friendly)
    if (process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
      console.log('Using Base64 encoded Firebase credentials.');
    } 
    // Method 2: Raw JSON string in environment variable
    else if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      console.log('Using raw JSON string Firebase credentials.');
    }
    // Method 3: Secret file mounted on Render (or local file)
    else {
      const secretFilePath = path.resolve(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(secretFilePath)) {
        const fileContent = fs.readFileSync(secretFilePath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
        console.log('Using secret file for Firebase credentials.');
      } else {
        console.warn('No Firebase credentials found. Push notifications will be disabled.');
        console.warn('Please set FIREBASE_ADMIN_CREDENTIALS_BASE64, FIREBASE_ADMIN_CREDENTIALS, or provide firebase-service-account.json');
        return;
      }
    }

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
    const message: any = {
      token: fcmToken,
      android: {
        priority: 'high' as const,
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            'content-available': 1,
            sound: 'default',
            category: 'INCOMING_CALL',
          },
        },
      },
    };

    // Special handling for incoming calls (VoIP)
    if (data && data.type === 'incoming_call') {
      // For calls, we use data-only notification with high priority
      // We DO NOT set the notification field or android.notification field
      // This ensures onMessageReceived is called even in background
      message.data = {
        ...data,
        // Ensure all values are strings
        ...Object.fromEntries(
          Object.entries(data)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        )
      };
      
      // Set high priority for data message
      message.android = {
        priority: 'high',
        ttl: 0, // Deliver immediately or drop
      };
      
      // Remove apns payload for Android if strictly targeting Android, 
      // but we might need it for iOS later. For now, keep it simple.
    } else {
      // Standard notification
      message.notification = {
        title: title,
        body: body,
      };
      
      if (data) {
        message.data = Object.fromEntries(
          Object.entries({ ...data, type: data.type || 'incoming_call' })
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        );
      } else {
        message.data = { type: 'incoming_call' };
      }
      
      message.android.notification = {
        channelId: 'calls_v2',
        sound: 'default',
      };
    }

    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
