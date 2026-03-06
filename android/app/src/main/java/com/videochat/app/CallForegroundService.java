package com.videochat.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import android.content.pm.ServiceInfo;
import android.os.Build;

public class CallForegroundService extends Service {
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String callerName = intent.getStringExtra("callerName");
        
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0,
                fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, "call_channel")
                .setContentTitle("Входящий звонок")
                .setContentText("От " + (callerName != null ? callerName : "Unknown"))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(999, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
            } catch (Exception e) {
                // Fallback if permission is missing or other error
                startForeground(999, notification);
            }
        } else {
            startForeground(999, notification);
        }
        
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
