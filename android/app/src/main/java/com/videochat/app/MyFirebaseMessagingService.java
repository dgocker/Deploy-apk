package com.videochat.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.content.Intent;
import android.util.Log;
import android.telecom.TelecomManager;
import android.telecom.PhoneAccountHandle;
import android.content.ComponentName;
import android.os.Bundle;
import android.content.Context;

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

                TelecomManager tm = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
                PhoneAccountHandle handle = new PhoneAccountHandle(
                    new ComponentName(this, MyConnectionService.class),
                    "videochat_account"
                );

                Bundle extras = new Bundle();
                extras.putString("callerName", callerName);

                tm.addNewIncomingCall(handle, extras);
            }
        }
    }
}
