<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getUserPlaylists,
		createPlaylist,
		updatePlaylist,
		deletePlaylist,
		type Playlist
	} from '$lib/pocketbase';

	export let onPlaylistsChange: (() => void) | undefined = undefined;

	let playlists: Playlist[] = [];
	let loading = true;
	let showCreateForm = false;
	let editingPlaylist: Playlist | null = null;

	// Form fields
	let newName = '';
	let newDescription = '';
	let newIcon = '📁';

	const availableIcons = ['📁', '🎵', '🔊', '🌲', '🏙️', '⚠️', '🗣️', '⭐', '🎯', '💼', '🏠', '🎮'];

	onMount(async () => {
		await loadPlaylists();
	});

	async function loadPlaylists() {
		loading = true;
		try {
			playlists = await getUserPlaylists();
		} catch (error) {
			console.error('Error loading playlists:', error);
		} finally {
			loading = false;
		}
	}

	function startCreate() {
		showCreateForm = true;
		editingPlaylist = null;
		newName = '';
		newDescription = '';
		newIcon = '📁';
	}

	function startEdit(playlist: Playlist) {
		editingPlaylist = playlist;
		showCreateForm = true;
		newName = playlist.name;
		newDescription = playlist.description || '';
		newIcon = playlist.icon || '📁';
	}

	function cancelForm() {
		showCreateForm = false;
		editingPlaylist = null;
		newName = '';
		newDescription = '';
		newIcon = '📁';
	}

	async function handleSubmit() {
		if (!newName.trim()) {
			alert('Please enter a playlist name');
			return;
		}

		try {
			if (editingPlaylist) {
				// Update existing playlist
				await updatePlaylist(editingPlaylist.id, {
					name: newName.trim(),
					description: newDescription.trim(),
					icon: newIcon
				});
			} else {
				// Create new playlist
				console.log('Creating playlist:', { name: newName.trim(), description: newDescription.trim(), icon: newIcon });
				await createPlaylist(newName.trim(), newDescription.trim(), newIcon);
			}

			await loadPlaylists();
			cancelForm();

			// Notify parent component
			if (onPlaylistsChange) {
				onPlaylistsChange();
			}
		} catch (error: any) {
			console.error('Error saving playlist:', error);
			console.error('Error details:', error.response || error.message);

			// Show more detailed error message
			let errorMsg = 'Failed to save playlist. ';
			if (error.response?.data) {
				errorMsg += JSON.stringify(error.response.data);
			} else if (error.message) {
				errorMsg += error.message;
			} else {
				errorMsg += 'Please check console for details.';
			}
			alert(errorMsg);
		}
	}

	async function handleDelete(playlist: Playlist) {
		if (!confirm(`Delete playlist "${playlist.name}"? Sounds in this playlist will not be deleted.`)) {
			return;
		}

		try {
			await deletePlaylist(playlist.id);
			await loadPlaylists();

			// Notify parent component
			if (onPlaylistsChange) {
				onPlaylistsChange();
			}
		} catch (error) {
			console.error('Error deleting playlist:', error);
			alert('Failed to delete playlist. Please try again.');
		}
	}
</script>

<div class="playlist-manager">
	<div class="header">
		<h3>My Playlists</h3>
		<button class="btn-create" on:click={startCreate}>+ New Playlist</button>
	</div>

	{#if loading}
		<div class="empty-state">Loading playlists...</div>
	{:else if playlists.length === 0 && !showCreateForm}
		<div class="empty-state">
			<p>No playlists yet. Create your first playlist to organize sounds!</p>
		</div>
	{:else}
		<div class="playlists-list">
			{#each playlists as playlist}
				<div class="playlist-item">
					<span class="playlist-icon">{playlist.icon || '📁'}</span>
					<div class="playlist-details">
						<h4>{playlist.name}</h4>
						{#if playlist.description}
							<p class="description">{playlist.description}</p>
						{/if}
					</div>
					<div class="playlist-actions">
						<button class="btn-icon" on:click={() => startEdit(playlist)} title="Edit">
							✏️
						</button>
						<button class="btn-icon delete" on:click={() => handleDelete(playlist)} title="Delete">
							🗑️
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if showCreateForm}
		<div class="playlist-form">
			<h4>{editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}</h4>

			<div class="form-group">
				<label for="playlist-name">Playlist Name</label>
				<input
					id="playlist-name"
					type="text"
					bind:value={newName}
					placeholder="e.g., Morning Focus"
					maxlength="50"
				/>
			</div>

			<div class="form-group">
				<label for="playlist-description">Description (optional)</label>
				<textarea
					id="playlist-description"
					bind:value={newDescription}
					placeholder="What's this playlist for?"
					rows="2"
					maxlength="200"
				/>
			</div>

			<div class="form-group">
				<label>Icon</label>
				<div class="icon-picker">
					{#each availableIcons as icon}
						<button
							class="icon-option"
							class:selected={newIcon === icon}
							on:click={() => (newIcon = icon)}
							type="button"
						>
							{icon}
						</button>
					{/each}
				</div>
			</div>

			<div class="form-actions">
				<button class="btn-secondary" on:click={cancelForm}>Cancel</button>
				<button class="btn-primary" on:click={handleSubmit}>
					{editingPlaylist ? 'Save Changes' : 'Create Playlist'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.playlist-manager {
		background: var(--surface);
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid var(--border);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header h3 {
		margin: 0;
		color: var(--primary);
		font-size: 1.25rem;
	}

	.btn-create {
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary);
		background: var(--background);
		border-radius: 8px;
		border: 1px dashed var(--border);
	}

	.empty-state p {
		margin: 0;
	}

	.playlists-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.playlist-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		transition: all 0.2s;
	}

	.playlist-item:hover {
		border-color: var(--primary);
		transform: translateX(4px);
	}

	.playlist-icon {
		font-size: 2rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 8px;
		flex-shrink: 0;
	}

	.playlist-details {
		flex: 1;
		min-width: 0;
	}

	.playlist-details h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: var(--text);
	}

	.playlist-details .description {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.playlist-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-icon {
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon:hover {
		transform: scale(1.1);
		border-color: var(--primary);
	}

	.btn-icon.delete:hover {
		background: var(--danger);
		border-color: var(--danger);
	}

	.playlist-form {
		margin-top: 1.5rem;
		padding: 1.5rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.playlist-form h4 {
		margin: 0 0 1rem 0;
		color: var(--text);
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 1rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.icon-picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
		gap: 0.5rem;
	}

	.icon-option {
		width: 48px;
		height: 48px;
		border: 2px solid var(--border);
		background: var(--surface);
		border-radius: 8px;
		font-size: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-option:hover {
		border-color: var(--primary);
		transform: scale(1.05);
	}

	.icon-option.selected {
		border-color: var(--primary);
		background: var(--surface-light);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.btn-secondary,
	.btn-primary {
		flex: 1;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary {
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
	}

	.btn-secondary:hover {
		background: var(--surface-light);
	}

	.btn-primary {
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
	}

	@media (max-width: 600px) {
		.playlist-manager {
			padding: 1rem;
		}

		.icon-picker {
			grid-template-columns: repeat(6, 1fr);
		}

		.icon-option {
			width: 40px;
			height: 40px;
			font-size: 1.25rem;
		}
	}
</style>
