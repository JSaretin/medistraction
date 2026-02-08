<script lang="ts">
	import { onMount } from 'svelte';
	import { sessionStore } from '$lib/stores/session';
	import { loadSessionState, clearSessionState } from '$lib/stores/session-persistence';

	let showPrompt = false;
	let savedState: ReturnType<typeof loadSessionState> = null;
	let timeRemainingMinutes = 0;
	let timeRemainingSeconds = 0;

	onMount(() => {
		// Check if there's a saved session to restore
		savedState = loadSessionState();

		if (savedState) {
			showPrompt = true;
			// Calculate display time
			timeRemainingMinutes = Math.floor(savedState.timeRemaining / 60);
			timeRemainingSeconds = savedState.timeRemaining % 60;
		}
	});

	function handleRestore() {
		if (savedState) {
			sessionStore.restoreSession(savedState);
			showPrompt = false;
		}
	}

	function handleStartNew() {
		clearSessionState();
		showPrompt = false;
	}

	function handleDismiss() {
		clearSessionState();
		showPrompt = false;
	}
</script>

{#if showPrompt && savedState}
	<div class="overlay">
		<div class="restore-prompt">
			<div class="prompt-header">
				<h2>🧘 Resume Session?</h2>
				<button class="close-btn" on:click={handleDismiss} aria-label="Close">×</button>
			</div>

			<div class="prompt-content">
				<p class="prompt-message">You have an active meditation session in progress.</p>

				<div class="session-info">
					<div class="info-item">
						<span class="info-icon">⏱️</span>
						<div class="info-details">
							<span class="info-label">Time Remaining</span>
							<span class="info-value">
								{timeRemainingMinutes}:{timeRemainingSeconds.toString().padStart(2, '0')}
							</span>
						</div>
					</div>

					<div class="info-item">
						<span class="info-icon">🔊</span>
						<div class="info-details">
							<span class="info-label">Sounds Played</span>
							<span class="info-value">{savedState.soundsPlayed}</span>
						</div>
					</div>

					{#if savedState.isPaused}
						<div class="info-item">
							<span class="info-icon">⏸️</span>
							<div class="info-details">
								<span class="info-label">Status</span>
								<span class="info-value">Paused</span>
							</div>
						</div>
					{/if}
				</div>

				<p class="prompt-note">
					Your session was automatically saved. You can resume where you left off or start a new
					session.
				</p>
			</div>

			<div class="prompt-actions">
				<button class="action-btn secondary" on:click={handleStartNew}>Start New Session</button>
				<button class="action-btn primary" on:click={handleRestore}>Resume Session</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.restore-prompt {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
		max-width: 500px;
		width: 100%;
		animation: slideUp 0.3s ease-out;
		overflow: hidden;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.prompt-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--background);
	}

	.prompt-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--primary);
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}

	.close-btn:hover {
		background: var(--surface-light);
		color: var(--text);
	}

	.prompt-content {
		padding: 1.5rem;
	}

	.prompt-message {
		margin: 0 0 1.5rem 0;
		color: var(--text);
		font-size: 1rem;
	}

	.session-info {
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.info-icon {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 10px;
		flex-shrink: 0;
	}

	.info-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-label {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.info-value {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
	}

	.prompt-note {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.prompt-actions {
		display: flex;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid var(--border);
		background: var(--background);
	}

	.action-btn {
		flex: 1;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn.secondary {
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
	}

	.action-btn.secondary:hover {
		background: var(--surface-light);
		transform: translateY(-2px);
	}

	.action-btn.primary {
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
	}

	.action-btn.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
	}

	/* Mobile Responsive */
	@media (max-width: 600px) {
		.restore-prompt {
			margin: 1rem;
		}

		.prompt-header h2 {
			font-size: 1.25rem;
		}

		.prompt-actions {
			flex-direction: column;
		}

		.action-btn {
			width: 100%;
		}
	}
</style>
