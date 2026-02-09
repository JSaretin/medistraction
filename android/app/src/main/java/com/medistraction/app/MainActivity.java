package com.medistraction.app;

import android.media.AudioManager;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate()
        Log.i(TAG, "Registering BackgroundServicePlugin...");
        registerPlugin(BackgroundServicePlugin.class);

        Log.i(TAG, "Registering SimpleAudioPlayer...");
        registerPlugin(SimpleAudioPlayer.class);
        Log.i(TAG, "Plugins registered successfully");

        super.onCreate(savedInstanceState);

        // Configure audio for media playback
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        // Allow audio playback when screen is locked
        // Removed FLAG_KEEP_SCREEN_ON to allow manual locking
        // Native service uses PARTIAL_WAKE_LOCK to keep CPU awake
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );
    }

    @Override
    public void onPause() {
        super.onPause();
        Log.i(TAG, "Activity paused (screen may be locked)");
        // Don't stop the service - it should continue in background
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i(TAG, "Activity resumed (screen unlocked)");
    }

    @Override
    public void onStop() {
        super.onStop();
        Log.i(TAG, "Activity stopped (not visible)");
        // Don't release resources - service is still running
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "Activity destroyed");
        super.onDestroy();
    }
}
