<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore } from '$lib/stores/session';

	let audioContext: AudioContext | null = null;
	let checkInterval: ReturnType<typeof setInterval> | null = null;
	let lastPlayedSound = '';

	onMount(() => {
		// Initialize Web Audio API
		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

		// Check if it's time to play a sound
		checkInterval = setInterval(() => {
			if (!$sessionStore.isPaused && $sessionStore.isActive && $sessionStore.nextSoundAt) {
				const now = Date.now();
				if (now >= $sessionStore.nextSoundAt) {
					playRandomSound();
				}
			}
		}, 100); // Check every 100ms
	});

	onDestroy(() => {
		if (checkInterval) clearInterval(checkInterval);
		if (audioContext) audioContext.close();
	});

	async function playRandomSound() {
		if (!audioContext || $sessionStore.config.selectedSounds.length === 0) return;

		// Select a random sound
		const sounds = $sessionStore.config.selectedSounds;
		const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

		try {
			// Fetch and decode audio
			const response = await fetch(randomSound.url);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

			// Create source and gain nodes
			const source = audioContext.createBufferSource();
			const gainNode = audioContext.createGain();

			source.buffer = audioBuffer;

			// Set volume (with random variation if enabled)
			let volume = randomSound.volume || 0.7;
			if ($sessionStore.config.varyVolume) {
				volume = volume * (0.6 + Math.random() * 0.4); // 60-100% of set volume
			}
			gainNode.gain.value = volume;

			// Connect nodes
			source.connect(gainNode);
			gainNode.connect(audioContext.destination);

			// Play sound
			source.start(0);
			lastPlayedSound = randomSound.name;

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

{#if lastPlayedSound}
	<div class="sound-indicator">
		<div class="pulse"></div>
		<span>🔊 {lastPlayedSound}</span>
	</div>
{/if}

<style>
	.sound-indicator {
		position: fixed;
		top: 2rem;
		right: 2rem;
		padding: 1rem 1.5rem;
		background: var(--surface);
		border: 1px solid var(--primary);
		border-radius: var(--border-radius);
		display: flex;
		align-items: center;
		gap: 0.75rem;
		animation: slideIn 0.3s ease-out;
		box-shadow: var(--shadow);
	}

	.pulse {
		width: 12px;
		height: 12px;
		background: var(--primary);
		border-radius: 50%;
		animation: pulse 1.5s infinite;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.3);
		}
	}
</style>
