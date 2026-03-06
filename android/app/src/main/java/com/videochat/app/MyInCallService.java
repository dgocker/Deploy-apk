package com.videochat.app;

import android.telecom.Call;
import android.telecom.InCallService;

public class MyInCallService extends InCallService {

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        // Можно открыть свой UI или просто позволить Android показать экран звонка
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
    }
}
