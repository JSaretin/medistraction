# Sound Counter & Timer Sync Fix

## Problem

When the app was locked, there was a mismatch between:
- **Progress bar (native notification)**: Showed 13 sounds played, 3:00 remaining
- **App UI (JavaScript)**: Showed 6 sounds played, 6:00 remaining

## Root Cause

The native Android service (`MeditationService.java`) was:
1. ✅ Scheduling sounds correctly with PARTIAL_WAKE_LOCK (not throttled when locked)
2. ❌ Incrementing `soundsPlayed` counter **before** sending event to JavaScript
3. ❌ Not waiting for confirmation that JavaScript actually played the sound

Result: When the screen was locked, JavaScript might not execute `playRandomSound()`, but native kept counting anyway.

## Solution

### Changes Made

#### 1. Native Layer (`MeditationService.java`)
- **Removed** native `soundsPlayed++` increment when scheduling sounds
- **Added** `UPDATE_NOTIFICATION` action handler that receives actual state from JavaScript
- Now native only schedules sounds, JavaScript confirms when actually played

#### 2. JavaScript Layer (`SoundPlayer.svelte`)
- **Added** call to `BackgroundService.updateNotification()` after successfully playing a sound
- **Added** listener for `TIMER_UPDATE` events to sync JavaScript timer with native timer
- JavaScript now updates native notification with the **actual** count after each sound plays

## How It Works Now

### Sound Counting Flow
```
1. Native timer triggers at scheduled time
2. Native sends PLAY_SOUND event to JavaScript
3. JavaScript plays sound
4. ✅ JavaScript increments counter (source of truth)
5. ✅ JavaScript calls updateNotification() with actual count
6. ✅ Native updates notification with JavaScript's count
```

### Timer Sync Flow
```
1. Native timer counts down (source of truth - not throttled)
2. Native sends TIMER_UPDATE every 5 seconds
3. ✅ JavaScript syncs its timer with native's value
4. Both show the same time
```

## Why This Architecture?

- **Native timer** is source of truth for **time** (won't be throttled when locked)
- **JavaScript** is source of truth for **sounds played** (only counts successful plays)
- **Best of both worlds**: Reliable timing + accurate counting

## Testing

After rebuilding and deploying:

1. ✅ Start a meditation session
2. ✅ Lock your phone
3. ✅ Listen for sounds playing in background
4. ✅ Unlock and check: notification count should match app count

Expected behavior:
- Notification shows accurate sound count (only sounds actually played)
- Notification shows accurate time (from reliable native timer)
- App UI syncs with notification (via TIMER_UPDATE events)

## Build Commands

```bash
npm run build:mobile
npx cap sync android
npm run build:apk
```

Then install and test on device.
