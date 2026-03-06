package com.videochat.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import android.app.KeyguardManager;
import android.os.Build;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Turn screen on and show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        // Request to ignore battery optimizations for VoIP calls
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }

        // Register PhoneAccount for Telecom API
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.telecom.TelecomManager telecomManager = (android.telecom.TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            android.telecom.PhoneAccountHandle handle = new android.telecom.PhoneAccountHandle(
                    new android.content.ComponentName(this, MyConnectionService.class),
                    "videochat_account"
            );

            android.telecom.PhoneAccount phoneAccount = android.telecom.PhoneAccount.builder(handle, "VideoChat Calls")
                    .setCapabilities(android.telecom.PhoneAccount.CAPABILITY_CALL_PROVIDER)
                    .build();

            telecomManager.registerPhoneAccount(phoneAccount);
        }
    }
}
