# Native App Setup Guide

Your Medistraction app has been converted to a native app using Capacitor! This provides proper background audio support that won't be suppressed by the browser.

## What Was Changed

1. **Capacitor Integration**: Added iOS and Android native platforms
2. **Native Audio Plugin**: Uses `@capacitor-community/native-audio` for reliable background playback
3. **Background Permissions**: Added Android permissions for foreground services and wake lock
4. **Adaptive Audio**: Automatically uses native audio on mobile, HTML5 audio on web

## Build & Run

### Android

1. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

2. **Build and Run**:
   - Connect your Android device or start an emulator
   - Click the "Run" button in Android Studio
   - The app will install and launch on your device

3. **Build APK for Testing**:
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK will be in `android/app/build/outputs/apk/debug/`

### iOS

1. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

2. **Build and Run**:
   - Connect your iOS device
   - Select your device as the target
   - Click the "Run" button
   - You may need to configure code signing with your Apple Developer account

## Development Workflow

1. **Make changes to your web code** (src/ directory)

2. **Build the web app**:
   ```bash
   npm run build
   ```

3. **Sync changes to native platforms**:
   ```bash
   npx cap sync
   ```

4. **Run in Android Studio or Xcode**

## Background Audio Features

✅ **Works in background**: Sounds continue playing when app is minimized
✅ **No queuing**: Native audio prevents browser throttling issues
✅ **Wake lock**: Device stays awake during meditation sessions
✅ **Foreground service**: Android treats this as active audio playback

## Testing Background Audio

1. Start a meditation session
2. Minimize the app (go to home screen)
3. Sounds should continue playing in the background
4. Maximize the app - no overlapping sounds!

## Publishing

### Android (Google Play Store)
1. Update `android/app/build.gradle` with proper version numbers
2. Create a keystore for signing
3. Build signed APK/AAB
4. Upload to Google Play Console

### iOS (App Store)
1. Configure signing certificates in Xcode
2. Archive the app
3. Upload via Xcode or Transporter
4. Submit for App Store review

## Reverting to Web-Only

If you want to deploy as a web app only (Vercel), change `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-vercel';
```

Then run `npm run build` as normal.

## Troubleshooting

**Audio not playing in background**:
- Make sure you granted permissions when the app first launched
- Check that wake lock is activated (look for console logs)
- Ensure the device is not in battery saver mode

**Build errors**:
- Run `npx cap sync` after any changes
- Clean build in Android Studio/Xcode
- Update Capacitor: `npm update @capacitor/core @capacitor/cli`

**Preloading errors**:
- Make sure audio files are accessible via URL
- Check that PocketBase URLs are publicly accessible
- Native audio requires direct file URLs

## Next Steps

1. Test the app on a physical device
2. Configure app icons and splash screens (in `android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`)
3. Update app metadata (name, version, etc.)
4. Build release version for distribution

Your app now has true native background audio capabilities! 🎉
