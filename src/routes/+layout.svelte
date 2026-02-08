<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { initPageLifecycleHandlers, cleanupPageLifecycleHandlers } from '$lib/stores/page-lifecycle';

	onMount(() => {
		initPageLifecycleHandlers();
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
