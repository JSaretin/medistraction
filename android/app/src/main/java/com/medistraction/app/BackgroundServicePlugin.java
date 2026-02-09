package com.medistraction.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {
    private BroadcastReceiver timerEventReceiver;

    @Override
    public void load() {
        // Register broadcast receiver for timer events
        timerEventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String eventType = intent.getStringExtra("eventType");
                int timeRemaining = intent.getIntExtra("timeRemaining", 0);
                int soundsPlayed = intent.getIntExtra("soundsPlayed", 0);

                android.util.Log.i("BackgroundServicePlugin", "Received event: " + eventType + ", timeRemaining=" + timeRemaining + ", soundsPlayed=" + soundsPlayed);

                JSObject data = new JSObject();
                data.put("eventType", eventType);
                data.put("timeRemaining", timeRemaining);
                data.put("soundsPlayed", soundsPlayed);

                notifyListeners("timerEvent", data);
            }
        };

        IntentFilter filter = new IntentFilter("com.medistraction.app.TIMER_EVENT");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(timerEventReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(timerEventReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (timerEventReceiver != null) {
            try {
                getContext().unregisterReceiver(timerEventReceiver);
            } catch (Exception e) {
                android.util.Log.e("BackgroundServicePlugin", "Error unregistering receiver", e);
            }
        }
    }

    @PluginMethod
    public void startSession(PluginCall call) {
        Integer duration = call.getInt("duration");
        Integer minWait = call.getInt("minWait");
        Integer maxWait = call.getInt("maxWait");

        if (duration == null || minWait == null || maxWait == null) {
            call.reject("Missing required parameters");
            return;
        }

        // Request battery optimization exemption
        requestBatteryOptimizationExemption();

        Intent serviceIntent = new Intent(getContext(), MeditationService.class);
        serviceIntent.setAction("START_SESSION");
        serviceIntent.putExtra("duration", duration);
        serviceIntent.putExtra("minWait", minWait);
        serviceIntent.putExtra("maxWait", maxWait);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        call.resolve();
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            String packageName = getContext().getPackageName();

            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                android.util.Log.i("BackgroundServicePlugin", "Requesting battery optimization exemption");
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    android.util.Log.e("BackgroundServicePlugin", "Error requesting battery optimization exemption", e);
                }
            }
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), MeditationService.class);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        // Also ensure audio mode is set correctly
        configureAudioMode();

        call.resolve();
    }

    @PluginMethod
    public void updateNotification(PluginCall call) {
        Integer timeRemaining = call.getInt("timeRemaining");
        Integer soundsPlayed = call.getInt("soundsPlayed");

        android.util.Log.i("BackgroundServicePlugin", "updateNotification called: timeRemaining=" + timeRemaining + ", soundsPlayed=" + soundsPlayed);

        if (timeRemaining == null || soundsPlayed == null) {
            android.util.Log.e("BackgroundServicePlugin", "Missing parameters!");
            call.reject("Missing timeRemaining or soundsPlayed");
            return;
        }

        Intent serviceIntent = new Intent(getContext(), MeditationService.class);
        serviceIntent.setAction("UPDATE_NOTIFICATION");
        serviceIntent.putExtra("timeRemaining", timeRemaining);
        serviceIntent.putExtra("soundsPlayed", soundsPlayed);

        android.util.Log.i("BackgroundServicePlugin", "Starting service with UPDATE_NOTIFICATION action");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), MeditationService.class);
        getContext().stopService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void configureAudio(PluginCall call) {
        configureAudioMode();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void configureAudioMode() {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_NORMAL);
                audioManager.setSpeakerphoneOn(false);
            }
        } catch (Exception e) {
            android.util.Log.e("BackgroundService", "Error configuring audio mode", e);
        }
    }
}
