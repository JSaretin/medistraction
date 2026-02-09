package com.medistraction.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import java.util.Random;

public class MeditationService extends Service {
    private static final String CHANNEL_ID = "MeditationChannel";
    private static final int NOTIFICATION_ID = 1;
    private MediaSessionCompat mediaSession;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private PowerManager.WakeLock wakeLock;

    // Native timer components
    private Handler timerHandler;
    private Runnable timerRunnable;
    private Runnable soundScheduleRunnable;
    private long sessionStartTime;
    private int sessionDuration; // seconds
    private int minWait; // seconds
    private int maxWait; // seconds
    private long nextSoundTime;
    private int soundsPlayed;
    private Random random;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        setupMediaSession();
        requestAudioFocus();
        acquireWakeLock();

        // Initialize native timer components
        timerHandler = new Handler(Looper.getMainLooper());
        random = new Random();
    }

    private void setupMediaSession() {
        // Create MediaSession to register as media app
        mediaSession = new MediaSessionCompat(this, "MeditationSession");
        mediaSession.setActive(true);

        // Set playback state
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_STOP)
            .setState(PlaybackStateCompat.STATE_PLAYING, 0, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            // Create audio focus change listener
            AudioManager.OnAudioFocusChangeListener focusChangeListener = focusChange -> {
                switch (focusChange) {
                    case AudioManager.AUDIOFOCUS_GAIN:
                        android.util.Log.d("MeditationService", "Audio focus gained");
                        break;
                    case AudioManager.AUDIOFOCUS_LOSS:
                    case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                        android.util.Log.d("MeditationService", "Audio focus lost");
                        break;
                }
            };

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setWillPauseWhenDucked(false)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(focusChangeListener)
                .build();

            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            );
        }
    }

    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        // Use PARTIAL_WAKE_LOCK - screen can turn off, but CPU stays awake
        // Native timers won't be throttled like JavaScript
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Medistraction::MeditationWakeLock"
        );
        wakeLock.acquire(10 * 60 * 60 * 1000L); // 10 hours max
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        android.util.Log.i("MeditationService", "onStartCommand called with action: " + action);

        if ("STOP_SERVICE".equals(action)) {
            cleanup();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if ("START_SESSION".equals(action)) {
            // Get session configuration from intent
            sessionDuration = intent.getIntExtra("duration", 600); // default 10 minutes
            minWait = intent.getIntExtra("minWait", 30);
            maxWait = intent.getIntExtra("maxWait", 120);
            android.util.Log.i("MeditationService", "Starting session: duration=" + sessionDuration + "s, minWait=" + minWait + "s, maxWait=" + maxWait + "s");

            // Initialize session - DON'T initialize soundsPlayed here, let JavaScript manage it
            sessionStartTime = System.currentTimeMillis();
            scheduleNextSound();
            startSessionTimer();

            // Create and start foreground service with notification
            Notification notification = buildNotification(sessionDuration, 0);
            startForeground(NOTIFICATION_ID, notification);
            android.util.Log.i("MeditationService", "Started foreground service");
            return START_STICKY;
        }

        if ("UPDATE_NOTIFICATION".equals(action)) {
            // JavaScript is telling us the actual state to display
            int jsTimeRemaining = intent.getIntExtra("timeRemaining", -1);
            int jsSoundsPlayed = intent.getIntExtra("soundsPlayed", 0);
            android.util.Log.i("MeditationService", "Received UPDATE_NOTIFICATION from JS: timeRemaining=" + jsTimeRemaining + ", soundsPlayed=" + jsSoundsPlayed);

            // Update our tracking to match JavaScript's state
            this.soundsPlayed = jsSoundsPlayed;

            // Update the notification with JavaScript's values
            if (jsTimeRemaining >= 0) {
                updateNotification(jsTimeRemaining, jsSoundsPlayed);
            }

            return START_STICKY;
        }

        // Default: just keep foreground service alive
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        cleanup();
        super.onDestroy();
    }

    private void cleanup() {
        // Stop timers
        if (timerHandler != null) {
            if (timerRunnable != null) {
                timerHandler.removeCallbacks(timerRunnable);
            }
            if (soundScheduleRunnable != null) {
                timerHandler.removeCallbacks(soundScheduleRunnable);
            }
        }

        // Release audio focus
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        }

        // Release media session
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }

        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Meditation Session",
                NotificationManager.IMPORTANCE_HIGH
            );
            serviceChannel.setDescription("Keeps your meditation session running");
            serviceChannel.setSound(null, null);
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    // Native timer methods
    private void startSessionTimer() {
        android.util.Log.i("MeditationService", "Starting session timer");
        timerRunnable = new Runnable() {
            @Override
            public void run() {
                long now = System.currentTimeMillis();
                long elapsed = now - sessionStartTime;
                int timeRemaining = sessionDuration - (int) (elapsed / 1000);

                // Log every 10 seconds to monitor if timer is running
                if (timeRemaining % 10 == 0) {
                    android.util.Log.i("MeditationService", "Timer tick: " + timeRemaining + "s remaining");
                }

                if (timeRemaining <= 0) {
                    // Session ended
                    android.util.Log.i("MeditationService", "Session ended");
                    sendEventToJavaScript("SESSION_ENDED", timeRemaining, soundsPlayed);
                    cleanup();
                    stopForeground(true);
                    stopSelf();
                    return;
                }

                // Update notification every second
                updateNotification(timeRemaining, soundsPlayed);

                // Send update to JavaScript every 5 seconds
                if (timeRemaining % 5 == 0) {
                    sendEventToJavaScript("TIMER_UPDATE", timeRemaining, soundsPlayed);
                }

                // Schedule next timer tick
                timerHandler.postDelayed(this, 1000);
            }
        };
        timerHandler.post(timerRunnable);
    }

    private void scheduleNextSound() {
        // Calculate random delay between min and max wait
        int delay = minWait + random.nextInt(maxWait - minWait + 1);
        nextSoundTime = System.currentTimeMillis() + (delay * 1000);

        android.util.Log.i("MeditationService", "Scheduling next sound in " + delay + " seconds");

        soundScheduleRunnable = new Runnable() {
            @Override
            public void run() {
                // Time to play sound! DON'T increment here - let JavaScript do it
                android.util.Log.i("MeditationService", "Triggering sound play event");
                sendEventToJavaScript("PLAY_SOUND", getTimeRemaining(), soundsPlayed);

                // Schedule next sound
                scheduleNextSound();
            }
        };

        timerHandler.postDelayed(soundScheduleRunnable, delay * 1000);
    }

    private int getTimeRemaining() {
        long now = System.currentTimeMillis();
        long elapsed = now - sessionStartTime;
        return sessionDuration - (int) (elapsed / 1000);
    }

    private Notification buildNotification(int timeRemaining, int soundsPlayed) {
        // Format time remaining
        String contentText;
        if (timeRemaining > 0) {
            int minutes = timeRemaining / 60;
            int seconds = timeRemaining % 60;
            contentText = String.format("%d:%02d remaining • %d sounds played", minutes, seconds, soundsPlayed);
        } else {
            contentText = "Session complete • " + soundsPlayed + " sounds played";
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, MeditationService.class);
        stopIntent.setAction("STOP_SERVICE");
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Meditation in Progress")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPendingIntent)
            .setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0))
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    private void updateNotification(int timeRemaining, int soundsPlayed) {
        Notification notification = buildNotification(timeRemaining, soundsPlayed);
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, notification);
        }
    }

    private void sendEventToJavaScript(String eventType, int timeRemaining, int soundsPlayed) {
        // Send explicit broadcast that JavaScript can listen to
        // Use setPackage() to make it explicit and bypass Android broadcast restrictions
        Intent intent = new Intent("com.medistraction.app.TIMER_EVENT");
        intent.setPackage(getPackageName()); // Make broadcast explicit
        intent.putExtra("eventType", eventType);
        intent.putExtra("timeRemaining", timeRemaining);
        intent.putExtra("soundsPlayed", soundsPlayed);

        android.util.Log.i("MeditationService", "Sending broadcast: " + eventType + ", timeRemaining=" + timeRemaining + ", soundsPlayed=" + soundsPlayed);
        sendBroadcast(intent);
    }
}
