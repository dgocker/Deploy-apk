package com.videochat.app

import android.app.Activity
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

class IncomingCallActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Make activity show over lock screen
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        
        setContentView(R.layout.activity_incoming_call)
        
        val callerName = intent.getStringExtra("caller_name") ?: "Unknown"
        findViewById<TextView>(R.id.callerName).text = callerName
        
        findViewById<Button>(R.id.btnAccept).setOnClickListener {
            // Handle accept logic
            finish()
        }
        
        findViewById<Button>(R.id.btnReject).setOnClickListener {
            // Handle reject logic
            finish()
        }
    }
}
