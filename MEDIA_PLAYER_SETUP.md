# Media Player Configuration for Lock Screen Playback ✅

## Changes Made to Enable Playback When Phone is Locked

### 1. MeditationService.java - Full Media Player Support
Added comprehensive media player capabilities:

- ✅ **MediaSession Integration**: Registers the app as a media player with Android
- ✅ **Audio Focus Management**: Requests and manages audio focus properly
- ✅ **Wake Lock**: Keeps CPU running even when screen is off
- ✅ **Media-Style Notification**: Shows proper media controls in notification
- ✅ **Audio Attributes**: Configured for `USAGE_MEDIA` and `CONTENT_TYPE_MUSIC`

### 2. MainActivity.java - Audio Configuration
- ✅ Set volume control stream to `STREAM_MUSIC`
- ✅ Added flags to allow playback when screen is locked
- ✅ Configured window flags for lock screen display

### 3. build.gradle - Media Library
- ✅ Added `androidx.media:media:1.6.0` dependency
- Required for MediaSession support

### 4. AndroidManifest.xml - Audio Permission
- ✅ Added `MODIFY_AUDIO_SETTINGS` permission
- Allows app to configure audio routing and settings

## How It Works Now

1. **App starts meditation session** → Background service starts
2. **Service creates MediaSession** → Android recognizes app as media player
3. **Service requests audio focus** → Gets priority for audio playback
4. **Wake lock acquired** → CPU stays active even when screen off
5. **Media notification shown** → User sees media controls
6. **Phone locks** → Audio continues playing ✅
7. **Other apps open** → Audio continues in background ✅

## Build and Test

```bash
# Clean build (recommended after adding dependencies)
cd android
./gradlew clean

# Return to project root
cd ..

# Build and sync
npm run build:mobile
npx cap sync

# Build APK
npm run build:apk

# Or open in Android Studio
npm run open:android
```

## Testing Checklist

### Lock Screen Test:
1. ✅ Start meditation session
2. ✅ See "Meditation in Progress" notification
3. ✅ Lock the phone (press power button)
4. ✅ **Audio should continue playing** 🎵
5. ✅ Unlock phone → Session still running

### Background Test:
1. ✅ Start meditation session
2. ✅ Press home button (minimize app)
3. ✅ Open other apps
4. ✅ **Audio continues in background** 🎵
5. ✅ Notification remains visible

### Media Controls Test:
1. ✅ Start meditation session
2. ✅ Lock phone
3. ✅ Wake phone (don't unlock)
4. ✅ Should see media notification on lock screen
5. ✅ Can tap to return to app

## What Makes This Work

### MediaSession
- Tells Android "I'm a media player"
- Shows up in media controls
- Gets priority for audio playback
- Survives screen lock

### Audio Focus
- Requests `AUDIOFOCUS_GAIN` with `USAGE_MEDIA`
- Prevents other apps from ducking our audio
- Maintains audio priority

### Wake Lock
- Keeps CPU running in background
- Prevents system from sleeping
- Critical for timer accuracy

### Media-Style Notification
- Required for media playback recognition
- Shows media controls
- Visible on lock screen

## Troubleshooting

### Still no audio when locked?
1. **Check Do Not Disturb**: Make sure DND isn't blocking media
2. **Check media volume**: Lock phone and use volume buttons
3. **Check battery saver**: Disable battery optimization for the app
4. **Test with different sounds**: Make sure audio files are accessible

### Service not starting?
1. Check notification permission granted
2. Check Android logs: `adb logcat | grep Meditation`
3. Verify service is registered in manifest

### Audio stops after a while?
1. Check manufacturer battery optimization (Samsung, Xiaomi, etc.)
2. Add app to "Protected apps" list
3. Disable "Adaptive Battery" for the app

## Testing on Different Android Versions

- **Android 13+**: Will prompt for notification permission
- **Android 12**: Media controls in notification shade
- **Android 11**: Media session shows in Quick Settings
- **Android 10 and below**: Basic foreground service behavior

## Expected Behavior

✅ **Audio plays when phone is locked**
✅ **Timer continues counting in background**
✅ **Notification stays visible**
✅ **Can control from lock screen**
✅ **Survives app switching**
✅ **Works with Bluetooth/headphones**

This is now a **proper media player app** that Android recognizes and gives audio priority to! 🎉
