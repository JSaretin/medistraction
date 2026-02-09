<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore } from '$lib/stores/session';
	import { Capacitor } from '@capacitor/core';
	import { App } from '@capacitor/app';
	import BackgroundService from '$lib/plugins/backgroundService';
	import SimpleAudioPlayer from '$lib/plugins/simpleAudioPlayer';

	let checkInterval: ReturnType<typeof setInterval> | null = null;
	let wakeLock: any = null;
	let activeSounds: HTMLAudioElement[] = [];
	let isNative = Capacitor.isNativePlatform();
	let preloadedSounds: Map<string, string> = new Map();
	let isPlaying = false; // Guard against multiple simultaneous plays
	let appStateListener: any = null;
	let soundsPreloaded = false; // Prevent duplicate preloads

	async function requestWakeLock() {
		// Request screen wake lock to prevent device from sleeping
		if ('wakeLock' in navigator) {
			try {
				wakeLock = await (navigator as any).wakeLock.request('screen');
				console.log('Wake Lock activated');

				wakeLock.addEventListener('release', () => {
					console.log('Wake Lock released');
				});
			} catch (err: any) {
				console.error('Wake Lock error:', err);
			}
		}
	}

	function releaseWakeLock() {
		if (wakeLock) {
			wakeLock.release();
			wakeLock = null;
		}
	}

	async function preloadSounds() {
		// Prevent duplicate preloads
		if (soundsPreloaded) {
			console.log('Sounds already preloaded, skipping');
			return;
		}

		console.log('=== Starting to preload sounds ===');
		const sounds = $sessionStore.config.selectedSounds;
		console.log('Sounds to preload:', sounds.length);

		for (const sound of sounds) {
			try {
				console.log(`Preloading: ${sound.name} (${sound.id})`);
				console.log(`URL: ${sound.url}`);

				// Use SimpleAudioPlayer which works with HTTP URLs
				console.log('Calling SimpleAudioPlayer.preload...');
				const result = await SimpleAudioPlayer.preload({
					assetId: sound.id,
					url: sound.url
				});
				console.log('SimpleAudioPlayer.preload returned:', result);

				preloadedSounds.set(sound.id, sound.url);
				console.log(`✅ Preloaded sound: ${sound.name}`);
			} catch (error) {
				console.error(`❌ Error preloading sound ${sound.name}:`, error);
				console.error('Error details:', JSON.stringify(error));
			}
		}

		console.log('Total preloaded sounds:', preloadedSounds.size);
		console.log('Preloaded sound IDs:', Array.from(preloadedSounds.keys()));

		// Mark as preloaded to prevent duplicates
		soundsPreloaded = true;
		console.log('✅ All sounds preloaded successfully');
	}

	async function unloadSounds() {
		// Unload all preloaded sounds
		for (const soundId of preloadedSounds.keys()) {
			try {
				await SimpleAudioPlayer.unload({ assetId: soundId });
			} catch (error) {
				console.error(`Error unloading sound ${soundId}:`, error);
			}
		}
		preloadedSounds.clear();
		soundsPreloaded = false; // Allow preload on next session
	}

	onMount(() => {
		console.log('🔵 SoundPlayer onMount');
		console.log('isActive:', $sessionStore.isActive);
		console.log('isNative:', isNative);
		console.log('soundsPreloaded:', soundsPreloaded);

		// Set up native timer event listener
		if (isNative) {
			BackgroundService.addListener('timerEvent', (event) => {
				console.log('📱 Native timer event:', event.eventType, 'timeRemaining:', event.timeRemaining, 'soundsPlayed:', event.soundsPlayed);

				if (event.eventType === 'PLAY_SOUND') {
					// Native says it's time to play a sound
					playRandomSound();
				} else if (event.eventType === 'TIMER_UPDATE') {
					// Sync JavaScript timer with native timer (source of truth)
					sessionStore.updateTime(event.timeRemaining);
				} else if (event.eventType === 'SESSION_ENDED') {
					// Session ended
					console.log('Session ended from native timer');
					sessionStore.endSession();
				}
			});
		}

		// Request wake lock when session is active
		if ($sessionStore.isActive) {
			console.log('Session is active, requesting wake lock');
			requestWakeLock();
			if (isNative) {
				console.log('Is native platform, calling preloadSounds()');
				preloadSounds();
			} else {
				console.log('NOT native platform, skipping preload');
			}
		} else {
			console.log('Session is NOT active, skipping preload');
		}

		// Listen for app state changes (pause/resume) on native platforms
		if (isNative) {
			App.addListener('appStateChange', (state) => {
				console.log('App state changed. isActive:', state.isActive, 'isPlaying:', isPlaying);

				if (state.isActive) {
					// App resumed - reset isPlaying flag and recalculate timing
					console.log('App resumed to foreground - resetting isPlaying flag');
					isPlaying = false;

					if ($sessionStore.isActive && !wakeLock) {
						requestWakeLock();
					}

					// Check if nextSoundAt is in the past (sound should have played while minimized)
					const now = Date.now();
					if ($sessionStore.nextSoundAt && now > $sessionStore.nextSoundAt + 5000) {
						// nextSoundAt is more than 5 seconds in the past - recalculate
						console.log('⚠️ nextSoundAt is significantly in the past, recalculating...');
						console.log('Old nextSoundAt:', new Date($sessionStore.nextSoundAt));
						console.log('Current time:', new Date(now));
						console.log('Config - minWait:', $sessionStore.config.minWait, 'maxWait:', $sessionStore.config.maxWait);

						// Reschedule next sound using current config values
						sessionStore.rescheduleNextSound();

						console.log('✅ Rescheduled next sound');
					}
				} else {
					// App going to background - keep everything running
					console.log('App moved to background, continuing playback...');
					// Do NOT reset isPlaying or stop audio - let it continue
				}
			}).then(listener => {
				appStateListener = listener;
			});
		}

		// Also listen for document visibility changes (web only - for PWA)
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				console.log('Document became visible');

				if ($sessionStore.isActive && !wakeLock) {
					requestWakeLock();
				}
			} else {
				console.log('Document hidden, continuing in background...');
				// Keep running in background
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Re-request wake lock if session becomes active
		const unsubscribe = sessionStore.subscribe(async (state) => {
			// Only log occasionally to avoid spam
			if (state.soundsPlayed === 0 || state.soundsPlayed % 5 === 0) {
				console.log('🟢 Session store updated - isActive:', state.isActive, 'wakeLock:', !!wakeLock, 'soundsPreloaded:', soundsPreloaded);
			}

			if (state.isActive) {
				// Request wake lock if not present
				if (!wakeLock) {
					console.log('Session active and no wake lock, requesting wake lock');
					requestWakeLock();
				}

				// Preload sounds if not already preloaded
				if (isNative && !soundsPreloaded) {
					console.log('Native platform and sounds not preloaded, calling preloadSounds() from subscription');
					preloadSounds();
					// Start native session timer with configuration
					try {
						await BackgroundService.startSession({
							duration: state.config.sessionDuration * 60, // convert to seconds
							minWait: state.config.minWait,
							maxWait: state.config.maxWait
						});
						console.log('Native session timer started');
					} catch (error) {
						console.error('Error starting native session:', error);
					}
				}
			} else if (!state.isActive && wakeLock) {
				releaseWakeLock();
				if (isNative) {
					unloadSounds();
					// Stop foreground service
					try {
						await BackgroundService.stop();
						console.log('Background service stopped');
					} catch (error) {
						console.error('Error stopping background service:', error);
					}
				}
			}
		});

		// For web platform only - use JavaScript timer as fallback
		if (!isNative) {
			let lastLogTime = 0;
			checkInterval = setInterval(() => {
				if (!$sessionStore.isPaused && $sessionStore.isActive && $sessionStore.nextSoundAt) {
					const now = Date.now();

					// Log status every 5 seconds for debugging
					if (now - lastLogTime > 5000) {
						const secondsUntilNext = Math.round(($sessionStore.nextSoundAt - now) / 1000);
						console.log(`⏱️ Next sound in ${secondsUntilNext}s (min: ${$sessionStore.config.minWait}, max: ${$sessionStore.config.maxWait})`);
						lastLogTime = now;
					}

					// Only play if time has come AND not already playing
					if (now >= $sessionStore.nextSoundAt && (!isPlaying || $sessionStore.config.allowMultipleSounds)) {
						playRandomSound();
					}
				}
			}, 100); // Check every 100ms
		}

		return () => {
			unsubscribe();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	onDestroy(async () => {
		if (checkInterval) clearInterval(checkInterval);
		releaseWakeLock();

		// Remove native timer event listeners
		if (isNative) {
			try {
				await BackgroundService.removeAllListeners();
			} catch (error) {
				console.error('Error removing listeners:', error);
			}
		}

		// Remove app state listener
		if (appStateListener) {
			appStateListener.remove();
		}

		// Stop all active sounds before unloading
		for (const soundId of preloadedSounds.keys()) {
			try {
				await SimpleAudioPlayer.stop({ assetId: soundId });
			} catch (error) {
				console.error(`Error stopping sound ${soundId}:`, error);
			}
		}
		await unloadSounds();

		// Stop background service
		if (isNative) {
			try {
				await BackgroundService.stop();
				console.log('Background service stopped on destroy');
			} catch (error) {
				console.error('Error stopping background service on destroy:', error);
			}
		}
	});

	async function playRandomSound() {
		console.log('=== playRandomSound called ===');
		console.log('Selected sounds count:', $sessionStore.config.selectedSounds.length);
		console.log('isPlaying:', isPlaying);
		console.log('isNative:', isNative);
		console.log('Preloaded sounds:', Array.from(preloadedSounds.keys()));

		if ($sessionStore.config.selectedSounds.length === 0) {
			console.log('No sounds selected, skipping');
			return;
		}

		// Guard against concurrent plays (unless multiple sounds allowed)
		if (isPlaying && !$sessionStore.config.allowMultipleSounds) {
			console.log('Already playing and multiple sounds not allowed, skipping...');
			return;
		}

		// Set playing flag
		isPlaying = true;
		console.log('Set isPlaying to true');

		// Update store FIRST to schedule next sound immediately
		// This prevents the interval from triggering multiple times
		sessionStore.soundPlayed();
		console.log('Called sessionStore.soundPlayed()');

		// Select a random sound
		const sounds = $sessionStore.config.selectedSounds;
		const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
		console.log('Selected sound:', randomSound.name, 'ID:', randomSound.id);

		try {
			// Calculate volume (with random variation if enabled)
			let volume = randomSound.volume || 0.7;
			if ($sessionStore.config.varyVolume) {
				volume = volume * (0.6 + Math.random() * 0.4); // 60-100% of set volume
			}

			if (preloadedSounds.has(randomSound.id)) {
				console.log('🔊 Playing sound with SimpleAudioPlayer');

				// Set volume
				await SimpleAudioPlayer.setVolume({
					assetId: randomSound.id,
					volume: volume
				});

				// Play the sound
				await SimpleAudioPlayer.play({
					assetId: randomSound.id
				});

				console.log(`✅ Playing: ${randomSound.name}`);

				// Update native notification with current state (after successful play)
				if (isNative) {
					try {
						await BackgroundService.updateNotification({
							timeRemaining: $sessionStore.timeRemaining,
							soundsPlayed: $sessionStore.soundsPlayed
						});
						console.log('Updated native notification:', $sessionStore.soundsPlayed, 'sounds played');
					} catch (error) {
						console.error('Error updating native notification:', error);
					}
				}

				// Estimate sound length and reset isPlaying flag
				setTimeout(() => {
					if (isPlaying) {
						console.log('Resetting isPlaying flag after timeout');
						isPlaying = false;
					}
				}, 4000);
			} else {
				console.error('❌ Sound not preloaded! ID:', randomSound.id);
				isPlaying = false;
			}

			// If multiple sounds enabled, potentially play another
			if ($sessionStore.config.allowMultipleSounds && Math.random() > 0.7) {
				setTimeout(() => playRandomSound(), 500 + Math.random() * 2000);
			}
		} catch (error) {
			console.error('Error playing sound:', error);
			isPlaying = false; // Reset on error
		}
	}
</script>
