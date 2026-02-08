<script lang="ts">
	import { onMount } from 'svelte';
	import {
		pb,
		getUserSounds,
		uploadSound,
		updateSound,
		deleteSound as pbDeleteSound,
		getFileUrl,
		isAuthenticated,
		getUserPlaylists,
		type Sound,
		type Playlist
	} from '$lib/pocketbase';
	import PlaylistManager from '$lib/components/PlaylistManager.svelte';

	let files: FileList | null = null;
	let soundUrl = '';
	let soundName = '';
	let selectedPlaylistIds: string[] = [];
	let uploading = false;
	let userSounds: Sound[] = [];
	let userPlaylists: Playlist[] = [];
	let loading = true;
	let currentAudio: HTMLAudioElement | null = null;
	let uploadMode: 'file' | 'url' = 'file';
	let showPlaylistManager = false;

	// Edit sound modal
	let editingSound: Sound | null = null;
	let editPlaylistIds: string[] = [];

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		await Promise.all([loadSounds(), loadPlaylists()]);
	}

	async function loadSounds() {
		if (!isAuthenticated()) {
			userSounds = [];
			loading = false;
			return;
		}

		try {
			userSounds = await getUserSounds();
		} catch (error) {
			console.error('Error loading sounds:', error);
		} finally {
			loading = false;
		}
	}

	async function loadPlaylists() {
		if (!isAuthenticated()) {
			userPlaylists = [];
			return;
		}

		try {
			userPlaylists = await getUserPlaylists();
		} catch (error) {
			console.error('Error loading playlists:', error);
		}
	}

	function togglePlaylist(playlistId: string) {
		if (selectedPlaylistIds.includes(playlistId)) {
			selectedPlaylistIds = selectedPlaylistIds.filter(id => id !== playlistId);
		} else {
			selectedPlaylistIds = [...selectedPlaylistIds, playlistId];
		}
	}

	function toggleEditPlaylist(playlistId: string) {
		if (editPlaylistIds.includes(playlistId)) {
			editPlaylistIds = editPlaylistIds.filter(id => id !== playlistId);
		} else {
			editPlaylistIds = [...editPlaylistIds, playlistId];
		}
	}

	function startEditSound(sound: Sound) {
		editingSound = sound;
		editPlaylistIds = [...(sound.playlists || [])];
	}

	function cancelEditSound() {
		editingSound = null;
		editPlaylistIds = [];
	}

	async function saveEditSound() {
		if (!editingSound) return;

		try {
			await updateSound(editingSound.id, {
				playlists: editPlaylistIds
			});

			await loadSounds();
			cancelEditSound();
		} catch (error) {
			console.error('Error updating sound:', error);
			alert('Failed to update sound playlists. Please try again.');
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		files = target.files;
	}

	async function uploadSounds() {
		if (!files || files.length === 0) return;

		if (!isAuthenticated()) {
			alert('Please log in to upload sounds');
			return;
		}

		uploading = true;

		try {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				await uploadSound(file, file.name, 0.7, selectedPlaylistIds);
			}

			alert('Sounds uploaded successfully!');
			files = null;
			selectedPlaylistIds = [];
			await loadSounds(); // Reload the list
		} catch (error) {
			console.error('Upload error:', error);
			alert('Error uploading sounds. Please try again.');
		} finally {
			uploading = false;
		}
	}

	async function uploadFromUrl() {
		if (!soundUrl.trim()) {
			alert('Please enter a URL');
			return;
		}

		if (!isAuthenticated()) {
			alert('Please log in to upload sounds');
			return;
		}

		uploading = true;

		try {
			// Fetch the file from URL
			const response = await fetch(soundUrl);
			if (!response.ok) {
				throw new Error('Failed to fetch file from URL');
			}

			// Check if it's an audio file
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.startsWith('audio/')) {
				throw new Error('URL does not point to an audio file');
			}

			// Get the blob
			const blob = await response.blob();

			// Generate filename from URL or use provided name
			let filename = soundName.trim();
			if (!filename) {
				const urlPath = new URL(soundUrl).pathname;
				filename = urlPath.substring(urlPath.lastIndexOf('/') + 1) || 'sound.mp3';
			}

			// Ensure filename has extension
			if (!filename.includes('.')) {
				const extension = contentType.split('/')[1] || 'mp3';
				filename += `.${extension}`;
			}

			// Create a File object from the blob
			const file = new File([blob], filename, { type: contentType });

			// Upload to PocketBase
			await uploadSound(file, filename, 0.7, selectedPlaylistIds);

			alert('Sound uploaded successfully!');
			soundUrl = '';
			soundName = '';
			selectedPlaylistIds = [];
			await loadSounds(); // Reload the list
		} catch (error: any) {
			console.error('Upload error:', error);
			alert(error.message || 'Error uploading sound from URL. Please try again.');
		} finally {
			uploading = false;
		}
	}

	async function deleteSound(soundId: string) {
		if (confirm('Are you sure you want to delete this sound?')) {
			try {
				await pbDeleteSound(soundId);
				userSounds = userSounds.filter((s) => s.id !== soundId);
			} catch (error) {
				console.error('Delete error:', error);
				alert('Error deleting sound. Please try again.');
			}
		}
	}

	function playSound(sound: Sound) {
		// Stop current audio if playing
		if (currentAudio) {
			currentAudio.pause();
			currentAudio = null;
		}

		const url = getFileUrl(sound, sound.file);
		currentAudio = new Audio(url);
		currentAudio.volume = sound.volume;
		currentAudio.play();
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
</script>

<div class="container">
	<header>
		<a href="/" class="back-btn">← Back</a>
		<h1>Sound Library</h1>
		<button class="manage-playlists-btn" on:click={() => showPlaylistManager = !showPlaylistManager}>
			{showPlaylistManager ? 'Hide' : 'Manage'} Playlists
		</button>
	</header>

	{#if showPlaylistManager}
		<div class="playlist-manager-section">
			<PlaylistManager onPlaylistsChange={loadPlaylists} />
		</div>
	{/if}

	<div class="upload-section">
		<h2>Upload New Sounds</h2>
		<p class="description">
			Upload sounds that typically distract you during the day. Accepted formats: MP3, WAV, OGG
		</p>

		<!-- Playlist Selector -->
		{#if userPlaylists.length > 0}
			<div class="form-field">
				<label>Add to Playlists (optional)</label>
				<div class="playlist-checkboxes">
					{#each userPlaylists as playlist}
						<label class="playlist-checkbox">
							<input
								type="checkbox"
								checked={selectedPlaylistIds.includes(playlist.id)}
								on:change={() => togglePlaylist(playlist.id)}
							/>
							<span class="checkbox-icon">{playlist.icon || '📁'}</span>
							<span class="checkbox-label">{playlist.name}</span>
						</label>
					{/each}
				</div>
				<small>Select one or more playlists for this sound</small>
			</div>
		{:else}
			<div class="form-field">
				<div class="no-playlists">
					<p>No playlists yet. <button class="link-btn" on:click={() => showPlaylistManager = true}>Create a playlist</button> to organize your sounds.</p>
				</div>
			</div>
		{/if}

		<!-- Upload Mode Tabs -->
		<div class="tabs">
			<button
				class="tab"
				class:active={uploadMode === 'file'}
				on:click={() => (uploadMode = 'file')}
			>
				📁 File Upload
			</button>
			<button
				class="tab"
				class:active={uploadMode === 'url'}
				on:click={() => (uploadMode = 'url')}
			>
				🔗 From URL
			</button>
		</div>

		<!-- File Upload -->
		{#if uploadMode === 'file'}
			<div class="upload-area">
				<input
					type="file"
					id="file-input"
					multiple
					accept="audio/*"
					on:change={handleFileSelect}
					disabled={uploading}
				/>
				<label for="file-input" class="file-label">
					<span class="upload-icon">📁</span>
					<span class="upload-text">
						{#if files && files.length > 0}
							{files.length} file(s) selected
						{:else}
							Click to select audio files
						{/if}
					</span>
				</label>

				{#if files && files.length > 0}
					<button class="upload-btn" on:click={uploadSounds} disabled={uploading}>
						{uploading ? '⏳ Uploading...' : '⬆️ Upload Files'}
					</button>
				{/if}
			</div>
		{/if}

		<!-- URL Upload -->
		{#if uploadMode === 'url'}
			<div class="upload-area">
				<div class="url-form">
					<div class="form-field">
						<label for="sound-url">Sound URL</label>
						<input
							id="sound-url"
							type="url"
							bind:value={soundUrl}
							placeholder="https://example.com/sound.mp3"
							disabled={uploading}
							class="url-input"
						/>
					</div>

					<div class="form-field">
						<label for="sound-name">Name (optional)</label>
						<input
							id="sound-name"
							type="text"
							bind:value={soundName}
							placeholder="e.g., Phone Notification"
							disabled={uploading}
							class="url-input"
						/>
						<small>If not provided, will use filename from URL</small>
					</div>

					<button class="upload-btn" on:click={uploadFromUrl} disabled={uploading || !soundUrl}>
						{uploading ? '⏳ Downloading & Uploading...' : '⬆️ Upload from URL'}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="sounds-section">
		<h2>Your Sounds ({userSounds.length})</h2>

		{#if loading}
			<p class="empty-state">Loading sounds...</p>
		{:else if !isAuthenticated()}
			<p class="empty-state">Please log in to manage your sounds. For now, you can use the default sounds in sessions.</p>
		{:else if userSounds.length === 0}
			<p class="empty-state">No sounds uploaded yet. Start by uploading some distraction sounds!</p>
		{:else}
			<div class="sounds-grid">
				{#each userSounds as sound}
					<div class="sound-card">
						<div class="sound-info">
							<span class="sound-icon">🔊</span>
							<div class="sound-details">
								<h3>{sound.name}</h3>
								<div class="sound-meta">
									<span class="sound-size">{formatFileSize(sound.size)}</span>
									{#if sound.expand?.playlists && sound.expand.playlists.length > 0}
										<div class="playlist-badges">
											{#each sound.expand.playlists as playlist}
												<span class="playlist-badge">
													{playlist.icon || '📁'} {playlist.name}
												</span>
											{/each}
										</div>
									{:else}
										<span class="no-playlist">No playlists</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="sound-actions">
							<button class="action-btn play" on:click={() => playSound(sound)} title="Play">▶️</button>
							<button class="action-btn edit" on:click={() => startEditSound(sound)} title="Edit Playlists">
								✏️
							</button>
							<button class="action-btn delete" on:click={() => deleteSound(sound.id)} title="Delete">
								🗑️
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Edit Sound Modal -->
{#if editingSound}
	<div class="modal-overlay" on:click={cancelEditSound}>
		<div class="modal" on:click={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Edit Playlists</h2>
				<button class="close-btn" on:click={cancelEditSound}>×</button>
			</div>

			<div class="modal-content">
				<p class="modal-sound-name">
					<span class="sound-icon">🔊</span>
					{editingSound.name}
				</p>

				{#if userPlaylists.length > 0}
					<div class="form-field">
						<label>Select Playlists</label>
						<div class="playlist-checkboxes">
							{#each userPlaylists as playlist}
								<label class="playlist-checkbox">
									<input
										type="checkbox"
										checked={editPlaylistIds.includes(playlist.id)}
										on:change={() => toggleEditPlaylist(playlist.id)}
									/>
									<span class="checkbox-icon">{playlist.icon || '📁'}</span>
									<span class="checkbox-label">{playlist.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{:else}
					<div class="empty-state">
						<p>No playlists available.</p>
						<button class="link-btn" on:click={() => { cancelEditSound(); showPlaylistManager = true; }}>
							Create a playlist first
						</button>
					</div>
				{/if}
			</div>

			<div class="modal-actions">
				<button class="btn-secondary" on:click={cancelEditSound}>Cancel</button>
				<button class="btn-primary" on:click={saveEditSound}>Save Changes</button>
			</div>
		</div>
	</div>
{/if}

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
		flex-wrap: wrap;
	}

	.manage-playlists-btn {
		margin-left: auto;
		padding: 0.5rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.manage-playlists-btn:hover {
		background: var(--surface-light);
		border-color: var(--primary);
	}

	.playlist-manager-section {
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

	.upload-section,
	.sounds-section {
		background: var(--surface);
		padding: 2rem;
		border-radius: var(--border-radius);
		margin-bottom: 2rem;
		box-shadow: var(--shadow);
	}

	h2 {
		margin-bottom: 1rem;
		color: var(--primary);
	}

	.description {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.form-field label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.form-field small {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.form-field > label {
		display: block;
		margin-bottom: 0.5rem;
	}

	.no-playlists {
		padding: 1rem;
		background: var(--background);
		border: 1px dashed var(--border);
		border-radius: 8px;
		text-align: center;
	}

	.no-playlists p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--primary);
		text-decoration: underline;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
	}

	.link-btn:hover {
		color: var(--secondary);
	}

	.playlist-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
		padding: 1rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.playlist-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.playlist-checkbox:hover {
		border-color: var(--primary);
		background: var(--surface-light);
	}

	.playlist-checkbox input[type="checkbox"] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.checkbox-icon {
		font-size: 1.2rem;
	}

	.checkbox-label {
		flex: 1;
		font-size: 0.9rem;
		color: var(--text);
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 2px solid var(--border);
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-secondary);
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: -2px;
	}

	.tab:hover {
		color: var(--text);
		background: var(--surface-light);
	}

	.tab.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
	}

	.upload-area {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.url-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.url-input {
		padding: 0.75rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.url-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.url-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-field small {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	#file-input {
		display: none;
	}

	.file-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 3rem 2rem;
		border: 2px dashed var(--border);
		border-radius: var(--border-radius);
		background: var(--background);
		cursor: pointer;
		transition: all 0.3s;
	}

	.file-label:hover {
		border-color: var(--primary);
		background: var(--surface-light);
	}

	.upload-icon {
		font-size: 3rem;
	}

	.upload-text {
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.upload-btn {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		border: none;
		border-radius: var(--border-radius);
		color: white;
		font-size: 1rem;
		font-weight: 600;
		transition: all 0.3s;
	}

	.upload-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
	}

	.upload-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		padding: 2rem;
	}

	.sounds-grid {
		display: grid;
		gap: 1rem;
	}

	.sound-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		transition: all 0.2s;
	}

	.sound-card:hover {
		border-color: var(--primary);
		transform: translateX(4px);
	}

	.sound-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.sound-icon {
		font-size: 1.5rem;
	}

	.sound-details h3 {
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.sound-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sound-size {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.playlist-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.playlist-badge {
		padding: 0.125rem 0.5rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.sound-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		width: 40px;
		height: 40px;
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.action-btn:hover {
		transform: scale(1.1);
	}

	.action-btn.play:hover {
		background: var(--primary);
		border-color: var(--primary);
	}

	.action-btn.edit:hover {
		background: var(--secondary);
		border-color: var(--secondary);
	}

	.action-btn.delete:hover {
		background: var(--danger);
		border-color: var(--danger);
	}

	.no-playlist {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-style: italic;
	}

	/* Modal Styles */
	.modal-overlay {
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
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
		max-width: 600px;
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
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

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--background);
	}

	.modal-header h2 {
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

	.modal-content {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-sound-name {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 1.5rem 0;
		padding: 1rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid var(--border);
		background: var(--background);
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
		.modal {
			max-height: 90vh;
		}

		.modal-header h2 {
			font-size: 1.25rem;
		}

		.modal-actions {
			flex-direction: column;
		}
	}
</style>
