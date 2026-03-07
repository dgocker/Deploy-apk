package com.videochat.app;

import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.DisconnectCause;
import android.telecom.PhoneAccountHandle;
import android.util.Log;

public class MyConnectionService extends ConnectionService {
    private static final String TAG = "MyConnectionService";

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.d(TAG, "✅ onCreateIncomingConnection called!");

        try {
            final String callerName = request.getExtras().getString("callerName", "Неизвестный");
            final String callId = request.getExtras().getString("callId");
            final String from = request.getExtras().getString("from");

            Connection connection = new Connection() {
                @Override
                public void onAnswer() {
                    Log.d(TAG, "✅ onAnswer: Accepting call");
                    setActive(); // Переходим в активное состояние

                    // Запускаем Activity с WebRTC (здесь интегрируй свой звонок)
                    Intent intent = new Intent(getApplicationContext(), IncomingCallActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    intent.putExtra("callerName", callerName);
                    intent.putExtra("callId", callId);
                    intent.putExtra("from", from);
                    startActivity(intent);
                }

                @Override
                public void onReject() {
                    Log.d(TAG, "❌ onReject: Rejecting call");
                    setDisconnected(new DisconnectCause(DisconnectCause.REJECTED));
                    destroy();
                }

                @Override
                public void onDisconnect() {
                    Log.d(TAG, "❌ onDisconnect: Ending call");
                    setDisconnected(new DisconnectCause(DisconnectCause.LOCAL));
                    destroy();
                }

                @Override
                public void onStateChanged(int state) {
                    super.onStateChanged(state);
                    Log.d(TAG, "Connection state changed: " + stateToString(state));
                }
            };

            connection.setRinging(); // Сообщаем, что звонок "звонит"
            return connection;

        } catch (Exception e) {
            Log.e(TAG, "❌ Error creating connection: " + e.getMessage(), e);
            return null;
        }
    }

    private String stateToString(int state) {
        switch (state) {
            case STATE_RINGING: return "RINGING";
            case STATE_ACTIVE: return "ACTIVE";
            case STATE_DISCONNECTED: return "DISCONNECTED";
            default: return "UNKNOWN";
        }
    }
}
