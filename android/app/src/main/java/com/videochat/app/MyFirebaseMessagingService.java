package com.videochat.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import android.util.Log;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.e("CALL_TEST", "CALL PUSH RECEIVED");
        Log.d("MyFirebaseMsgService", "From: " + remoteMessage.getFrom());

        // Check if message contains a data payload.
        if (remoteMessage.getData().size() > 0) {
            Log.d("MyFirebaseMsgService", "Message data payload: " + remoteMessage.getData());

            if (remoteMessage.getData().containsKey("type") && "incoming_call".equals(remoteMessage.getData().get("type"))) {
                String callerName = remoteMessage.getData().get("callerName");
                if (callerName == null) {
                    callerName = remoteMessage.getData().get("name");
                }

                // Start Foreground Service
                Intent serviceIntent = new Intent(this, CallForegroundService.class);
                serviceIntent.putExtra("callerName", callerName);
                ContextCompat.startForegroundService(this, serviceIntent);

                // Launch IncomingCallActivity
                Intent activityIntent = new Intent(this, IncomingCallActivity.class);
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                activityIntent.putExtra("callerName", callerName);
                startActivity(activityIntent);
            }
        }
    }
}
