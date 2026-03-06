package com.videochat.app;

import android.content.Intent;
import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.DisconnectCause;
import android.telecom.PhoneAccountHandle;

public class MyConnectionService extends ConnectionService {

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Connection connection = new Connection() {
            @Override
            public void onAnswer() {
                super.onAnswer();
                // Запускаем Activity с WebRTC
                Intent intent = new Intent(getApplicationContext(), IncomingCallActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.putExtra("callerName", request.getExtras().getString("callerName"));
                startActivity(intent);
                setActive();
            }

            @Override
            public void onDisconnect() {
                super.onDisconnect();
                setDisconnected(DisconnectCause.LOCAL);
                destroy();
            }
        };

        // Сообщаем системе, что звонок "звонит"
        connection.setRinging();
        return connection;
    }
}
