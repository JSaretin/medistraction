<script lang="ts">
	import { sessionStore, type SessionConfig, type Sound } from '$lib/stores/session';
	import { onMount } from 'svelte';
	import { getUserSounds, getUserPlaylists, getFileUrl, isAuthenticated, type Playlist } from '$lib/pocketbase';

	let minWait = 30;
	let maxWait = 120;
	let sessionDuration = 10;
	let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
	let allowMultipleSounds = false;
	let varyVolume = true;

	let availableSounds: Sound[] = [];
	let selectedSoundIds: string[] = [];
	let userPlaylists: Playlist[] = [];
	let loading = true;
	let selectedPlaylistId: string = 'all';

	// Filtered sounds based on selected playlist
	$: filteredSounds =
		selectedPlaylistId === 'all'
			? availableSounds
			: availableSounds.filter((s) => s.playlists?.includes(selectedPlaylistId));

	onMount(async () => {
		if (!isAuthenticated()) {
			availableSounds = [];
			userPlaylists = [];
			loading = false;
			return;
		}

		try {
			const [userSounds, playlists] = await Promise.all([
				getUserSounds(),
				getUserPlaylists()
			]);

			// Convert PocketBase sounds to Sound format
			availableSounds = userSounds.map((s) => ({
				id: s.id,
				name: s.name,
				url: getFileUrl(s, s.file),
				volume: s.volume,
				playlists: s.playlists
			}));

			userPlaylists = playlists;
		} catch (error) {
			console.error('Error loading data:', error);
			availableSounds = [];
			userPlaylists = [];
		} finally {
			loading = false;
		}
	});

	function handleDifficultyChange() {
		switch (difficulty) {
			case 'easy':
				minWait = 60;
				maxWait = 180;
				allowMultipleSounds = false;
				break;
			case 'medium':
				minWait = 30;
				maxWait = 120;
				allowMultipleSounds = false;
				break;
			case 'hard':
				minWait = 10;
				maxWait = 60;
				allowMultipleSounds = true;
				break;
		}
	}

	function startSession() {
		if (selectedSoundIds.length === 0) {
			alert('Please select at least one sound');
			return;
		}

		const selectedSounds = availableSounds.filter((s) => selectedSoundIds.includes(s.id));

		const config: SessionConfig = {
			minWait,
			maxWait,
			sessionDuration,
			selectedSounds,
			difficulty,
			allowMultipleSounds,
			varyVolume
		};

		sessionStore.startSession(config);
	}

	function toggleSound(soundId: string) {
		if (selectedSoundIds.includes(soundId)) {
			selectedSoundIds = selectedSoundIds.filter((id) => id !== soundId);
		} else {
			selectedSoundIds = [...selectedSoundIds, soundId];
		}
	}
</script>

<div class="session-controls">
	<h2>Start Meditation Session</h2>

	<div class="form-group">
		<label for="difficulty">Difficulty Level</label>
		<select id="difficulty" bind:value={difficulty} on:change={handleDifficultyChange}>
			<option value="easy">Easy (Longer intervals)</option>
			<option value="medium">Medium (Moderate intervals)</option>
			<option value="hard">Hard (Short intervals, multiple sounds)</option>
		</select>
	</div>

	<div class="form-group">
		<label for="duration">Session Duration (minutes)</label>
		<input
			id="duration"
			type="number"
			bind:value={sessionDuration}
			min="1"
			max="60"
			class="input"
		/>
	</div>

	<div class="form-row">
		<div class="form-group">
			<label for="minWait">Min Wait (seconds)</label>
			<input id="minWait" type="number" bind:value={minWait} min="5" max="300" class="input" />
		</div>

		<div class="form-group">
			<label for="maxWait">Max Wait (seconds)</label>
			<input id="maxWait" type="number" bind:value={maxWait} min="10" max="600" class="input" />
		</div>
	</div>

	<div class="form-group">
		<label>Advanced Options</label>
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={allowMultipleSounds} />
				<span>Allow Multiple Sounds (overlapping distractions)</span>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={varyVolume} />
				<span>Vary Volume (random volume levels)</span>
			</label>
		</div>
	</div>

	{#if userPlaylists.length > 0}
		<div class="form-group">
			<label for="playlist">Filter by Playlist</label>
			<select id="playlist" bind:value={selectedPlaylistId}>
				<option value="all">All Sounds</option>
				{#each userPlaylists as playlist}
					<option value={playlist.id}>
						{playlist.icon || '📁'} {playlist.name}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="form-group">
		<label>Select Sounds</label>
		{#if loading}
			<div class="empty-state">Loading sounds...</div>
		{:else if !isAuthenticated()}
			<div class="empty-state">
				<p>Please <a href="/login">log in</a> or <a href="/signup">sign up</a> to upload and use sounds.</p>
			</div>
		{:else if availableSounds.length === 0}
			<div class="empty-state">
				<p>No sounds uploaded yet.</p>
				<a href="/upload" class="upload-btn-inline">🔊 Upload Sounds</a>
			</div>
		{:else if filteredSounds.length === 0}
			<div class="empty-state">
				<p>No sounds in this playlist.</p>
				<a href="/upload" class="upload-link">+ Upload sounds to this playlist</a>
			</div>
		{:else}
			<div class="sound-list">
				{#each filteredSounds as sound}
					<button
						class="sound-item"
						class:selected={selectedSoundIds.includes(sound.id)}
						on:click={() => toggleSound(sound.id)}
					>
						<span class="sound-icon">🔊</span>
						<span class="sound-name">{sound.name}</span>
						{#if selectedSoundIds.includes(sound.id)}
							<span class="check">✓</span>
						{/if}
					</button>
				{/each}
			</div>
			<a href="/upload" class="upload-link">+ Upload more sounds</a>
		{/if}
	</div>

	<button class="start-btn" on:click={startSession}>🧘 Begin Meditation</button>
</div>

<style>
	.session-controls {
		width: 100%;
		max-width: 500px;
		background: var(--surface);
		padding: 2rem;
		border-radius: var(--border-radius);
		box-shadow: var(--shadow);
	}

	h2 {
		margin-bottom: 2rem;
		text-align: center;
		color: var(--primary);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.input,
	select {
		width: 100%;
		padding: 0.75rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 1rem;
	}

	.input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.sound-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.sound-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--background);
		border: 2px solid var(--border);
		border-radius: 8px;
		text-align: left;
		transition: all 0.2s;
		width: 100%;
	}

	.sound-item:hover {
		border-color: var(--primary);
		background: var(--surface-light);
	}

	.sound-item.selected {
		border-color: var(--primary);
		background: var(--surface-light);
	}

	.sound-icon {
		font-size: 1.2rem;
	}

	.sound-name {
		flex: 1;
	}

	.check {
		color: var(--primary);
		font-weight: bold;
		font-size: 1.2rem;
	}

	.upload-link {
		display: inline-block;
		color: var(--primary);
		text-decoration: none;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.upload-link:hover {
		text-decoration: underline;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text-secondary);
	}

	.empty-state p {
		margin: 0 0 1rem 0;
	}

	.empty-state a {
		color: var(--primary);
		text-decoration: none;
		font-weight: 500;
	}

	.empty-state a:hover {
		text-decoration: underline;
	}

	.upload-btn-inline {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		border: none;
		border-radius: var(--border-radius);
		color: white !important;
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none !important;
		transition: all 0.3s;
	}

	.upload-btn-inline:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
	}

	.start-btn {
		width: 100%;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		border: none;
		border-radius: var(--border-radius);
		color: white;
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: 1rem;
		transition: all 0.3s;
	}

	.start-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
	}
</style>
