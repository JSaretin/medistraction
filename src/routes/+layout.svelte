<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { initPageLifecycleHandlers, cleanupPageLifecycleHandlers } from '$lib/stores/page-lifecycle';
	import { dev } from '$app/environment';

	onMount(() => {
		initPageLifecycleHandlers();

		// Register service worker for PWA
		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js')
				.then((registration) => {
					console.log('[PWA] Service Worker registered:', registration.scope);

					// Check for updates periodically
					setInterval(() => {
						registration.update();
					}, 60 * 60 * 1000); // Check every hour
				})
				.catch((error) => {
					console.error('[PWA] Service Worker registration failed:', error);
				});
		}
	});

	onDestroy(() => {
		cleanupPageLifecycleHandlers();
	});
</script>

<div class="app">
	<slot />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #0f0f23;
		color: #e0e0e0;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>
