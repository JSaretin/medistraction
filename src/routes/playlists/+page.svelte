<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated } from '$lib/pocketbase';
	import PlaylistManager from '$lib/components/PlaylistManager.svelte';

	onMount(() => {
		if (!isAuthenticated()) {
			goto('/login');
		}
	});
</script>

<div class="container">
	<header>
		<a href="/" class="back-btn">← Back</a>
		<h1>Manage Playlists</h1>
	</header>

	<div class="content">
		<p class="description">
			Create and organize playlists to categorize your sounds. You can add sounds to multiple
			playlists and easily filter them during session setup.
		</p>

		<PlaylistManager />

		<div class="help-section">
			<h3>How Playlists Work</h3>
			<ul>
				<li>Create custom playlists for different scenarios (e.g., "Work", "Morning Focus", "Coding")</li>
				<li>Add sounds to multiple playlists when uploading</li>
				<li>Filter sounds by playlist when setting up meditation sessions</li>
				<li>Organize your sound library for quick access</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
		min-height: 100vh;
	}

	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.back-btn {
		padding: 0.5rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s;
	}

	.back-btn:hover {
		background: var(--surface-light);
	}

	h1 {
		font-size: 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.description {
		color: var(--text-secondary);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.help-section {
		background: var(--surface);
		padding: 1.5rem;
		border-radius: 12px;
		border: 1px solid var(--border);
	}

	.help-section h3 {
		margin: 0 0 1rem 0;
		color: var(--primary);
		font-size: 1.1rem;
	}

	.help-section ul {
		margin: 0;
		padding-left: 1.5rem;
		color: var(--text-secondary);
		line-height: 1.8;
	}

	.help-section li {
		margin-bottom: 0.5rem;
	}

	@media (max-width: 600px) {
		.container {
			padding: 1rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
