# Timing Fix - Min/Max Wait After Minimize/Maximize

## Problem
When the app is minimized and then maximized, the min/max wait time settings weren't being respected. Sounds would play at incorrect intervals.

## Root Cause
When the app is minimized:
1. JavaScript execution can be throttled by the OS
2. Time continues passing while the interval might be paused
3. When the app resumes, `nextSoundAt` could be far in the past
4. This caused timing issues - sounds playing immediately or waiting too long

## Solution

### 1. Added `rescheduleNextSound()` to Session Store
**File:** `src/lib/stores/session.ts`

New method that recalculates `nextSoundAt` using the current config's min/max values WITHOUT incrementing the `soundsPlayed` counter:

```typescript
rescheduleNextSound: () => {
  update((state) => {
    const now = Date.now();
    const nextDelay = getRandomDelay(state.config.minWait, state.config.maxWait);
    return {
      ...state,
      nextSoundAt: now + nextDelay * 1000
    };
  });
}
```

### 2. Check and Reschedule on App Resume
**File:** `src/lib/components/SoundPlayer.svelte`

When the app becomes active again:
- Check if `nextSoundAt` is more than 5 seconds in the past
- If yes, reschedule using current min/max settings
- Preserves the sound count (doesn't increment for missed sounds)

```typescript
if ($sessionStore.nextSoundAt && now > $sessionStore.nextSoundAt + 5000) {
  console.log('⚠️ nextSoundAt is significantly in the past, recalculating...');
  sessionStore.rescheduleNextSound();
}
```

### 3. Added Timing Debug Logs
Added periodic logging (every 5 seconds) to show:
- How many seconds until next sound
- Current min/max wait settings
- Helps verify timing is correct

## Testing

### Build and Install:
```bash
npm run build:mobile
npx cap sync
npm run build:apk
```

### Watch Logs:
```bash
adb logcat | grep -E "(chromium|Meditation)"
```

### Test Scenario:

1. **Start session with specific min/max** (e.g., min: 30s, max: 60s)
2. **Watch logs** - you should see:
   ```
   ⏱️ Next sound in 45s (min: 30, max: 60)
   ```

3. **Wait for first sound to play**

4. **Minimize the app** (press home button)

5. **Wait 20-30 seconds**

6. **Maximize the app** (open it again)

7. **Check logs** - you should see:
   ```
   App resumed to foreground - resetting isPlaying flag
   ⚠️ nextSoundAt is significantly in the past, recalculating...
   Config - minWait: 30 maxWait: 60
   ✅ Rescheduled next sound
   ⏱️ Next sound in 42s (min: 30, max: 60)
   ```

8. **Verify timing** - next sound should play within the configured range (30-60s)

## What You'll See in Logs

### Normal Operation:
```
⏱️ Next sound in 45s (min: 30, max: 60)
⏱️ Next sound in 40s (min: 30, max: 60)
⏱️ Next sound in 35s (min: 30, max: 60)
...
=== playRandomSound called ===
✅ Native sound playing: [sound name]
⏱️ Next sound in 52s (min: 30, max: 60)
```

### After Minimize/Maximize:
```
App state changed. isActive: false
App moved to background, continuing playback...
[app minimized for 30 seconds]
App state changed. isActive: true
App resumed to foreground - resetting isPlaying flag
⚠️ nextSoundAt is significantly in the past, recalculating...
Old nextSoundAt: [past time]
Current time: [current time]
Config - minWait: 30 maxWait: 60
✅ Rescheduled next sound
⏱️ Next sound in 47s (min: 30, max: 60)
```

## Key Points

✅ **Config is preserved** - min/max values are maintained
✅ **Timing is recalculated** - uses fresh random value within range
✅ **Sound count accurate** - doesn't increment for "missed" sounds
✅ **Works in background** - timing continues even when minimized
✅ **Smooth resume** - proper timing restored when app reopens

## If Timing Still Seems Wrong

Check logs for:

1. **Config values after resume:**
   ```
   Config - minWait: X maxWait: Y
   ```
   Should match your session settings

2. **Rescheduling trigger:**
   ```
   ⚠️ nextSoundAt is significantly in the past
   ```
   Should appear when reopening after being minimized

3. **New schedule:**
   ```
   ⏱️ Next sound in Xs
   ```
   X should be between minWait and maxWait

If you see different values, the config might be getting reset somewhere else. Share the logs and I can help debug further!
