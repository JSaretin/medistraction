# Debug Audio Playback Issues

## Changes Made

### 1. Added Extensive Logging
- Every step of audio playback is now logged
- Can see exactly where audio playback fails
- Shows preload status, sound selection, and playback attempts

### 2. Fixed App Resume Behavior
- Now properly resets `isPlaying` flag when app resumes
- This was causing audio to not play after unlocking

### 3. Added Audio Configuration Method
- New `configureAudio()` method in BackgroundServicePlugin
- Ensures Android audio mode is set correctly

## How to Debug

### Step 1: Build and Install
```bash
npm run build:mobile
npx cap sync
npm run build:apk
```

Install the APK on your device.

### Step 2: View Logs in Real-Time

Open a terminal and run:
```bash
adb logcat | grep -E "(chromium|NativeAudio|Meditation|BackgroundService)"
```

This will show all relevant logs from:
- JavaScript console (chromium)
- NativeAudio plugin
- MeditationService
- BackgroundServicePlugin

### Step 3: Test Scenario 1 - Foreground Play

1. Start meditation session
2. Watch the logs - you should see:
   ```
   === Starting to preload sounds ===
   Sounds to preload: X
   ✅ Preloaded sound: [name]
   ✅ Native audio configured
   ✅ Android audio mode configured
   Background service started
   ```

3. Wait for first sound to play - you should see:
   ```
   === playRandomSound called ===
   Selected sounds count: X
   isPlaying: false
   isNative: true
   Preloaded sounds: [id1, id2, ...]
   Selected sound: [name] ID: [id]
   Using native audio playback
   Setting volume to: X.XX
   Calling NativeAudio.play()...
   ✅ Native sound playing: [name]
   ```

### Step 4: Test Scenario 2 - Lock Screen

1. With session running, **lock the phone**
2. Logs should show:
   ```
   App state changed. isActive: false
   App moved to background, continuing playback...
   ```

3. Audio should continue playing
4. Check logs for:
   ```
   === playRandomSound called ===
   ```
   (This means timer is still running and trying to play sounds)

### Step 5: Test Scenario 3 - Resume After Lock

1. **Unlock phone** and open app
2. Logs should show:
   ```
   App state changed. isActive: true
   App resumed to foreground - resetting isPlaying flag
   ```

3. Next sound should play normally
4. Check for playback logs

## What to Look For

### ❌ Problem: Sounds not preloading
**Symptoms:**
```
❌ Error preloading sound [name]: [error]
```

**Solution:** Check sound URLs are valid and accessible

### ❌ Problem: isPlaying stuck at true
**Symptoms:**
```
isPlaying: true
Already playing and multiple sounds not allowed, skipping...
```

**Solution:** The flag should now reset when app resumes. If it's still stuck, check the app state listener is working.

### ❌ Problem: Sound not found
**Symptoms:**
```
❌ Sound not preloaded! ID: [id]
Available preloaded sounds: [list]
```

**Solution:** Sound IDs might not match between config and preload. Check sound configuration.

### ❌ Problem: NativeAudio.play() fails
**Symptoms:**
```
Calling NativeAudio.play()...
[error message]
```

**Solution:** Check NativeAudio plugin is installed correctly and has permissions

### ❌ Problem: Audio stops when locked
**Symptoms:**
- No `=== playRandomSound called ===` logs after locking
- Timer stops (no interval calls)

**Solution:**
- Check foreground service is running (notification visible?)
- Check battery optimization is disabled
- Check wake lock is acquired

## Common Issues

### 1. Media Library Not Downloaded
If build fails with network error:
```bash
cd android
./gradlew clean
./gradlew assembleDebug --refresh-dependencies
```

### 2. Service Not Starting
Check logs for:
```
Background service started
```

If not present, the service isn't starting. Check:
- Service registered in AndroidManifest
- Notification permission granted
- No errors in service onCreate

### 3. Audio Focus Not Acquired
Check logs for "Audio focus" messages in the service.

### 4. Wake Lock Not Working
Look for "WakeLock" in logs. If wake lock isn't acquired, timer will pause when screen off.

## Next Steps Based on Logs

### If sounds preload successfully but don't play:
→ Check NativeAudio plugin configuration
→ Verify audio files are accessible
→ Test with different sound format

### If sounds play in foreground but stop when locked:
→ Check MediaSession is active (service logs)
→ Check audio focus is acquired
→ Verify wake lock is held

### If sounds don't resume after unlock:
→ Check if `isPlaying` is being reset
→ Verify preloaded sounds still exist after resume
→ Check if sounds need to be reloaded

## Send Me Logs

Copy the relevant logs from the terminal and share them. Focus on:
1. Preload phase
2. First sound playback attempt
3. Lock/unlock events
4. Any error messages

This will help identify exactly where the audio playback is failing!
