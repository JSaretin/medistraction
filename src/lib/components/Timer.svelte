<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore } from '$lib/stores/session';
	import { createSession, isAuthenticated } from '$lib/pocketbase';

	let interval: ReturnType<typeof setInterval> | null = null;

	$: minutes = Math.floor($sessionStore.timeRemaining / 60);
	$: seconds = $sessionStore.timeRemaining % 60;
	$: progress =
		($sessionStore.timeRemaining / ($sessionStore.config.sessionDuration * 60)) * 100;

	onMount(() => {
		interval = setInterval(() => {
			if (!$sessionStore.isPaused && $sessionStore.timeRemaining > 0) {
				sessionStore.updateTime($sessionStore.timeRemaining - 1);
			} else if ($sessionStore.timeRemaining <= 0) {
				handleSessionComplete();
			}
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	async function handleSessionComplete() {
		// Save session to PocketBase if authenticated
		if (isAuthenticated()) {
			try {
				await createSession({
					duration: $sessionStore.config.sessionDuration,
					sounds_played: $sessionStore.soundsPlayed,
					completed: true,
					config: $sessionStore.config
				});
			} catch (error) {
				console.error('Error saving session:', error);
			}
		}

		sessionStore.endSession();
		alert('Session complete! Well done. 🎉');
	}

	function togglePause() {
		if ($sessionStore.isPaused) {
			sessionStore.resumeSession();
		} else {
			sessionStore.pauseSession();
		}
	}

	async function endSession() {
		if (confirm('Are you sure you want to end this session?')) {
			// Save as incomplete if authenticated
			if (isAuthenticated()) {
				try {
					await createSession({
						duration: $sessionStore.config.sessionDuration,
						sounds_played: $sessionStore.soundsPlayed,
						completed: false,
						config: $sessionStore.config
					});
				} catch (error) {
					console.error('Error saving session:', error);
				}
			}

			sessionStore.endSession();
		}
	}
</script>

<div class="timer-container">
	<div class="timer">
		<svg class="progress-ring" width="250" height="250">
			<circle
				class="progress-ring-circle-bg"
				stroke="var(--surface)"
				stroke-width="8"
				fill="transparent"
				r="110"
				cx="125"
				cy="125"
			/>
			<circle
				class="progress-ring-circle"
				stroke="var(--primary)"
				stroke-width="8"
				fill="transparent"
				r="110"
				cx="125"
				cy="125"
				style="stroke-dasharray: {2 * Math.PI * 110}; stroke-dashoffset: {2 *
					Math.PI *
					110 *
					(1 - progress / 100)}"
			/>
		</svg>
		<div class="time">
			<span class="time-text">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
			<span class="sounds-count">{$sessionStore.soundsPlayed} sounds played</span>
		</div>
	</div>

	<div class="controls">
		<button class="control-btn" on:click={togglePause}>
			{$sessionStore.isPaused ? '▶️ Resume' : '⏸️ Pause'}
		</button>
		<button class="control-btn danger" on:click={endSession}>⏹️ End</button>
	</div>
</div>

<style>
	.timer-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.timer {
		position: relative;
		width: 250px;
		height: 250px;
	}

	.progress-ring {
		transform: rotate(-90deg);
	}

	.progress-ring-circle {
		transition: stroke-dashoffset 0.5s ease;
	}

	.time {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
	}

	.time-text {
		display: block;
		font-size: 3rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.sounds-count {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.controls {
		display: flex;
		gap: 1rem;
	}

	.control-btn {
		padding: 1rem 2rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--border-radius);
		color: var(--text);
		font-size: 1rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.control-btn:hover {
		background: var(--surface-light);
		transform: translateY(-2px);
		box-shadow: var(--shadow);
	}

	.control-btn.danger:hover {
		background: var(--danger);
		border-color: var(--danger);
	}
</style>
