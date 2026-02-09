# Background Execution Setup - COMPLETE ✅

## What's Been Implemented

### iOS (✅ Completed)
- **Added audio background mode** to `Info.plist`
- Allows continuous audio playback while app is backgrounded or phone is locked
- App will show "Playing" indicator in Control Center
- Timer and sounds will continue working

### Android (✅ Completed - with Foreground Service)
- **Foreground Service Implementation**: Created `MeditationService.java`
  - Shows persistent notification during meditation session
  - Keeps app running reliably in background
  - Prevents system from killing the app
- **Permissions**:
  - `WAKE_LOCK` - keeps CPU running
  - `FOREGROUND_SERVICE` - allows foreground service
  - `FOREGROUND_SERVICE_MEDIA_PLAYBACK` - specifies media playback service type
  - `POST_NOTIFICATIONS` - shows notification (Android 13+)
- **Custom Capacitor Plugin**: `BackgroundServicePlugin.java`
  - JavaScript interface to control the foreground service
  - Automatically starts when session begins
  - Automatically stops when session ends

### Capacitor Config (✅ Completed)
- Configured NativeAudio for background playback
- Enabled audio focus management
- Enabled fade effects

### SoundPlayer Component (✅ Completed)
- Integrated with background service
- Starts foreground service when meditation begins (Android)
- Stops service when meditation ends
- Continues timer and audio playback in background
- Handles app state changes without interrupting session

## Files Modified/Created

### Android Native Code
- ✅ `android/app/src/main/java/com/medistraction/app/MeditationService.java` (NEW)
- ✅ `android/app/src/main/java/com/medistraction/app/BackgroundServicePlugin.java` (NEW)
- ✅ `android/app/src/main/java/com/medistraction/app/MainActivity.java` (UPDATED)
- ✅ `android/app/src/main/AndroidManifest.xml` (UPDATED)

### iOS Configuration
- ✅ `ios/App/App/Info.plist` (UPDATED)

### TypeScript/SvelteKit
- ✅ `src/lib/plugins/backgroundService.ts` (NEW)
- ✅ `src/lib/components/SoundPlayer.svelte` (UPDATED)

### Configuration
- ✅ `capacitor.config.ts` (UPDATED)

## Build and Deploy

Run these commands to build and sync the changes:

```bash
# Build for mobile platforms
npm run build:mobile

# Sync changes to native projects
npx cap sync

# Open in Android Studio to test
npm run open:android

# Or build APK directly
npm run build:apk
```

## Testing Instructions

### On Android Device:
1. Install the app on a real device (not emulator - background execution may behave differently)
2. Start a meditation session
3. You should see a notification: "Meditation in Progress"
4. **Lock the phone** → Sounds should continue playing
5. **Minimize the app** → Timer continues, sounds continue
6. **Open another app** → Meditation continues in background
7. Pull down notification shade → You can tap to return to app or stop session

### On iOS Device:
1. Install the app on a real device
2. Start a meditation session
3. **Lock the phone** → Audio continues
4. **Minimize the app** → Timer and sounds continue
5. Check Control Center → Should show app is playing audio
6. **Open another app** → Session continues

## Troubleshooting

### Android: App still stops in background
- **Check battery optimization**: Go to Settings → Apps → Medistraction → Battery → "Don't optimize"
- **Check notification permission**: Ensure notification permission is granted (Android 13+)
- **Manufacturer-specific**: Some manufacturers (Samsung, Xiaomi, Huawei) have aggressive battery optimization. You may need to add the app to "Protected apps" or disable battery optimization.

### iOS: Audio stops when locked
- Ensure you're testing on a real device (not simulator)
- Check that silent mode is off (audio might not play in silent mode depending on audio category)
- Verify the app is built with the updated Info.plist

### Timer not updating in background
- The timer logic should continue running as long as the foreground service (Android) or audio session (iOS) is active
- If the UI doesn't update when returning to foreground, check the sessionStore reactivity

## How It Works

### Android Flow:
1. User starts meditation → `SoundPlayer` component mounts
2. Component calls `BackgroundService.start()`
3. `BackgroundServicePlugin` starts `MeditationService` as foreground service
4. System shows persistent notification
5. App continues running in background with WAKE_LOCK
6. NativeAudio plays sounds with background audio configuration
7. When session ends → `BackgroundService.stop()` removes notification and stops service

### iOS Flow:
1. User starts meditation → `SoundPlayer` component mounts
2. Component configures audio session for background playback
3. iOS recognizes app as audio app (due to `audio` background mode)
4. Audio session keeps app active in background
5. Timer and sounds continue while locked/backgrounded
6. When session ends → Audio session ends, background execution stops

## Request Permissions at Runtime

The foreground service will automatically request notification permission on Android 13+. The user will see a permission dialog when they start their first meditation session.

## Future Enhancements

- Add custom notification actions (Pause/Resume)
- Show remaining time in notification
- Add notification controls for meditation sounds
- Persist notification across app restarts if meditation is in progress
