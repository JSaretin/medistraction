<script lang="ts">
	import { isOffline, swUpdateAvailable, updateServiceWorker } from '$lib/stores/network';

	let showUpdatePrompt = false;

	$: if ($swUpdateAvailable) {
		showUpdatePrompt = true;
	}

	function handleUpdate() {
		updateServiceWorker();
	}
</script>

<!-- Offline Indicator -->
{#if $isOffline}
	<div class="offline-banner" role="alert">
		<div class="banner-content">
			<span class="icon">📴</span>
			<div class="message">
				<strong>You're offline</strong>
				<span class="sub">Your progress will sync when reconnected</span>
			</div>
		</div>
	</div>
{/if}

<!-- Update Available Prompt -->
{#if showUpdatePrompt}
	<div class="update-banner" role="alert">
		<div class="banner-content">
			<span class="icon">🔄</span>
			<div class="message">
				<strong>Update available</strong>
				<span class="sub">A new version of Medistraction is ready</span>
			</div>
			<button class="update-btn" on:click={handleUpdate}>Update</button>
		</div>
	</div>
{/if}

<style>
	.offline-banner,
	.update-banner {
		position: fixed;
		top: 4rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1001;
		max-width: 500px;
		width: calc(100% - 2rem);
		animation: slideDown 0.3s ease-out;
	}

	.offline-banner {
		background: rgba(239, 68, 68, 0.95);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.update-banner {
		background: rgba(99, 102, 241, 0.95);
		border: 1px solid rgba(99, 102, 241, 0.3);
	}

	.offline-banner,
	.update-banner {
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.message {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: white;
	}

	.message strong {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.message .sub {
		font-size: 0.85rem;
		opacity: 0.9;
	}

	.update-btn {
		padding: 0.5rem 1rem;
		background: white;
		color: var(--primary);
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.update-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (max-width: 600px) {
		.offline-banner,
		.update-banner {
			top: 3.5rem;
		}

		.banner-content {
			flex-wrap: wrap;
		}

		.update-btn {
			width: 100%;
			margin-top: 0.5rem;
		}
	}
</style>
