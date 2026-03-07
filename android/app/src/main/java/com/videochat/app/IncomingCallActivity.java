package com.videochat.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class IncomingCallActivity extends Activity {
    private static final String TAG = "IncomingCallActivity";
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_incoming_call); // Твой layout

        // Флаги для lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        // Wake lock на 60 секунд
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "videochat:call_wakelock");
        wakeLock.acquire(60000); // 60 сек

        // UI
        String callerName = getIntent().getStringExtra("callerName");
        TextView callerText = findViewById(R.id.caller_name);
        callerText.setText("Входящий звонок от: " + (callerName != null ? callerName : "Неизвестный"));

        Button acceptButton = findViewById(R.id.accept_button);
        acceptButton.setOnClickListener(v -> {
            Log.d(TAG, "✅ Accept pressed");
            // Здесь запусти WebRTC в JS (через Capacitor event)
            // Например: PluginCall.call("acceptCall", data);
            finish(); // Закрой Activity после принятия
        });

        Button rejectButton = findViewById(R.id.reject_button);
        rejectButton.setOnClickListener(v -> {
            Log.d(TAG, "❌ Reject pressed");
            // Отправь сигнал отклонения в Connection (через broadcast или static)
            finish();
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
