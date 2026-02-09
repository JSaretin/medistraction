<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore } from '$lib/stores/session';

	let checkInterval: ReturnType<typeof setInterval> | null = null;
	let wakeLock: any = null;
	let currentAudio: HTMLAudioElement | null = null;
	let activeSounds: HTMLAudioElement[] = [];

	async function requestWakeLock() {
		// Request screen wake lock to prevent device from sleeping
		// This keeps the app active and prevents audio throttling
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

	onMount(() => {
		// Request wake lock when session is active
		if ($sessionStore.isActive) {
			requestWakeLock();
		}

		// Re-request wake lock if session becomes active
		const unsubscribe = sessionStore.subscribe((state) => {
			if (state.isActive && !wakeLock) {
				requestWakeLock();
			} else if (!state.isActive && wakeLock) {
				releaseWakeLock();
			}
		});

		// Check if it's time to play a sound
		checkInterval = setInterval(() => {
			if (!$sessionStore.isPaused && $sessionStore.isActive && $sessionStore.nextSoundAt) {
				const now = Date.now();

				if (now >= $sessionStore.nextSoundAt) {
					playRandomSound();
				}
			}
		}, 100); // Check every 100ms

		return () => {
			unsubscribe();
		};
	});

	onDestroy(() => {
		if (checkInterval) clearInterval(checkInterval);
		releaseWakeLock();
		// Stop all active sounds
		activeSounds.forEach(audio => {
			audio.pause();
			audio.src = '';
		});
		activeSounds = [];
	});

	async function playRandomSound() {
		if ($sessionStore.config.selectedSounds.length === 0) return;

		// Select a random sound
		const sounds = $sessionStore.config.selectedSounds;
		const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

		try {
			// Use HTML5 Audio for better background playback
			const audio = new Audio(randomSound.url);

			// Set volume (with random variation if enabled)
			let volume = randomSound.volume || 0.7;
			if ($sessionStore.config.varyVolume) {
				volume = volume * (0.6 + Math.random() * 0.4); // 60-100% of set volume
			}
			audio.volume = volume;

			// Play the sound
			await audio.play();

			// Track active sounds for cleanup
			activeSounds.push(audio);

			// Remove from active sounds when finished
			audio.onended = () => {
				activeSounds = activeSounds.filter(a => a !== audio);
			};

			// Update store
			sessionStore.soundPlayed();

			// If multiple sounds enabled, potentially play another
			if ($sessionStore.config.allowMultipleSounds && Math.random() > 0.7) {
				setTimeout(() => playRandomSound(), 500 + Math.random() * 2000);
			}
		} catch (error) {
			console.error('Error playing sound:', error);
		}
	}
</script>
