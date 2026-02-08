<script lang="ts">
	import { onMount } from 'svelte';
	import { isInstalled } from '$lib/stores/network';

	let deferredPrompt: any = null;
	let showPrompt = false;

	onMount(() => {
		// Check if already in standalone mode
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches
			|| (window.navigator as any).standalone
			|| document.referrer.includes('android-app://');

		if (isStandalone) {
			console.log('[PWA] Already running in standalone mode');
			return;
		}

		// Listen for the beforeinstallprompt event
		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
			console.log('[PWA] Install prompt captured');

			// Show install prompt if not already installed
			if (!$isInstalled) {
				setTimeout(() => {
					showPrompt = true;
				}, 3000); // Show after 3 seconds
			}
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);

		// Listen for successful installation
		const handleInstalled = () => {
			console.log('[PWA] App installed successfully');
			showPrompt = false;
			deferredPrompt = null;
		};

		window.addEventListener('appinstalled', handleInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
			window.removeEventListener('appinstalled', handleInstalled);
		};
	});

	async function handleInstall() {
		if (!deferredPrompt) return;

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user's response
		const { outcome } = await deferredPrompt.userChoice;

		console.log(`[PWA] User response: ${outcome}`);

		if (outcome === 'accepted') {
			showPrompt = false;
		}

		deferredPrompt = null;
	}

	function dismissPrompt() {
		showPrompt = false;
	}
</script>

{#if showPrompt && !$isInstalled}
	<div class="install-prompt" role="dialog" aria-labelledby="install-title">
		<div class="prompt-content">
			<button class="close-btn" on:click={dismissPrompt} aria-label="Close">×</button>

			<div class="prompt-icon">🧘</div>

			<h3 id="install-title">Install Medistraction</h3>
			<p>Install the app for quick access and offline use</p>

			<div class="features">
				<div class="feature">
					<span class="feature-icon">⚡</span>
					<span>Fast loading</span>
				</div>
				<div class="feature">
					<span class="feature-icon">📴</span>
					<span>Works offline</span>
				</div>
				<div class="feature">
					<span class="feature-icon">🏠</span>
					<span>Home screen access</span>
				</div>
			</div>

			<button class="install-btn" on:click={handleInstall}>Install App</button>

			<button class="later-btn" on:click={dismissPrompt}>Maybe Later</button>
		</div>
	</div>
{/if}

<style>
	.install-prompt {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1002;
		max-width: 400px;
		width: calc(100% - 2rem);
		animation: slideUp 0.4s ease-out;
	}

	.prompt-content {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 2rem 1.5rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
		position: relative;
		text-align: center;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 2rem;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		line-height: 1;
	}

	.close-btn:hover {
		color: var(--text);
		transform: rotate(90deg);
	}

	.prompt-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	h3 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--text);
	}

	p {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.features {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.feature {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.feature-icon {
		font-size: 1.5rem;
	}

	.install-btn {
		width: 100%;
		padding: 1rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: 0.75rem;
	}

	.install-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
	}

	.later-btn {
		width: 100%;
		padding: 0.75rem;
		background: transparent;
		color: var(--text-secondary);
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.later-btn:hover {
		color: var(--text);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(100px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (max-width: 600px) {
		.install-prompt {
			bottom: 5rem;
		}

		.features {
			gap: 1rem;
		}
	}
</style>
