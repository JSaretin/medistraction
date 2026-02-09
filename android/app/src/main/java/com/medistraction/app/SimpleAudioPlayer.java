package com.medistraction.app;

import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "SimpleAudioPlayer")
public class SimpleAudioPlayer extends Plugin {
    private static final String TAG = "SimpleAudioPlayer";
    private Map<String, MediaPlayer> players = new HashMap<>();

    @PluginMethod
    public void preload(PluginCall call) {
        Log.i(TAG, "preload() called");
        String assetId = call.getString("assetId");
        String url = call.getString("url");
        Log.i(TAG, "Preloading assetId: " + assetId + ", url: " + url);

        if (assetId == null || url == null) {
            call.reject("Missing assetId or url");
            return;
        }

        // Check if already preloaded
        if (players.containsKey(assetId)) {
            Log.i(TAG, "Asset already preloaded: " + assetId);
            call.resolve();
            return;
        }

        // Run prepare synchronously on a background thread
        new Thread(() -> {
            try {
                MediaPlayer player = new MediaPlayer();
                player.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                );
                Log.i(TAG, "Setting data source: " + url);
                player.setDataSource(url);

                Log.i(TAG, "Calling prepare() synchronously...");
                player.prepare(); // Synchronous prepare - will block until complete or error
                Log.i(TAG, "prepare() completed successfully for assetId: " + assetId);

                players.put(assetId, player);

                getBridge().executeOnMainThread(() -> {
                    Log.i(TAG, "Resolving promise for assetId: " + assetId);
                    call.resolve();
                });
            } catch (Exception e) {
                Log.e(TAG, "Exception during prepare: " + e.getMessage(), e);
                getBridge().executeOnMainThread(() -> {
                    call.reject("Error preparing audio: " + e.getMessage(), e);
                });
            }
        }).start();
    }

    @PluginMethod
    public void play(PluginCall call) {
        String assetId = call.getString("assetId");

        if (assetId == null) {
            call.reject("Missing assetId");
            return;
        }

        MediaPlayer player = players.get(assetId);
        if (player == null) {
            call.reject("Audio not preloaded");
            return;
        }

        try {
            if (player.isPlaying()) {
                player.seekTo(0);
            } else {
                player.start();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Error playing audio", e);
        }
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        String assetId = call.getString("assetId");
        Float volume = call.getFloat("volume");

        if (assetId == null || volume == null) {
            call.reject("Missing assetId or volume");
            return;
        }

        MediaPlayer player = players.get(assetId);
        if (player != null) {
            player.setVolume(volume, volume);
            call.resolve();
        } else {
            call.reject("Audio not found");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        String assetId = call.getString("assetId");

        MediaPlayer player = players.get(assetId);
        if (player != null && player.isPlaying()) {
            player.pause();
            player.seekTo(0);
        }
        call.resolve();
    }

    @PluginMethod
    public void unload(PluginCall call) {
        String assetId = call.getString("assetId");

        MediaPlayer player = players.get(assetId);
        if (player != null) {
            player.release();
            players.remove(assetId);
        }
        call.resolve();
    }
}
