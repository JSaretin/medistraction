<script lang="ts">
	import { onMount } from 'svelte';
	import { getUserSessions, isAuthenticated, type Session } from '$lib/pocketbase';

	let sessions: Session[] = [];
	let loading = true;

	onMount(async () => {
		if (!isAuthenticated()) {
			// Show mock data for demo
			loading = false;
			return;
		}

		try {
			sessions = await getUserSessions();
		} catch (error) {
			console.error('Error loading sessions:', error);
		} finally {
			loading = false;
		}
	});

	$: totalSessions = sessions.length;
	$: completedSessions = sessions.filter((s) => s.completed).length;
	$: totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
	$: totalSoundsHandled = sessions.reduce((acc, s) => acc + s.sounds_played, 0);
	$: completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="container">
	<header>
		<a href="/" class="back-btn">← Back</a>
		<h1>Progress Dashboard</h1>
	</header>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<h3>Total Sessions</h3>
				<p class="stat-value">{totalSessions}</p>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">✅</div>
			<div class="stat-content">
				<h3>Completed</h3>
				<p class="stat-value">{completedSessions}</p>
				<p class="stat-sub">{completionRate.toFixed(0)}% completion rate</p>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">⏱️</div>
			<div class="stat-content">
				<h3>Time Meditated</h3>
				<p class="stat-value">{totalMinutes} min</p>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🔊</div>
			<div class="stat-content">
				<h3>Distractions Handled</h3>
				<p class="stat-value">{totalSoundsHandled}</p>
			</div>
		</div>
	</div>

	<div class="sessions-section">
		<h2>Recent Sessions</h2>

		{#if loading}
			<p class="empty-state">Loading sessions...</p>
		{:else if !isAuthenticated()}
			<p class="empty-state">Please log in to track your meditation sessions.</p>
		{:else if sessions.length === 0}
			<p class="empty-state">No sessions yet. Start your first meditation!</p>
		{:else}
			<div class="sessions-list">
				{#each sessions as session}
					<div class="session-card" class:incomplete={!session.completed}>
						<div class="session-header">
							<span class="session-date">{formatDate(session.created)}</span>
							<span class="session-status" class:completed={session.completed}>
								{session.completed ? '✓ Completed' : '⏸️ Incomplete'}
							</span>
						</div>
						<div class="session-details">
							<div class="detail">
								<span class="detail-label">Duration:</span>
								<span class="detail-value">{session.duration} min</span>
							</div>
							<div class="detail">
								<span class="detail-label">Sounds:</span>
								<span class="detail-value">{session.sounds_played}</span>
							</div>
							<div class="detail">
								<span class="detail-label">Difficulty:</span>
								<span class="detail-value">{session.config?.difficulty || 'medium'}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="insights-section">
		<h2>Insights</h2>
		<div class="insight-card">
			<p class="insight-text">
				🎯 You've handled <strong>{totalSoundsHandled} distractions</strong> across your meditation sessions.
				Keep building that focus muscle!
			</p>
		</div>
		{#if completionRate < 70}
			<div class="insight-card warning">
				<p class="insight-text">
					💡 Try starting with shorter sessions to build consistency. Even 5 minutes daily is better than
					occasional longer sessions.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		max-width: 1000px;
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

	h2 {
		margin-bottom: 1rem;
		color: var(--primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--surface);
		padding: 1.5rem;
		border-radius: var(--border-radius);
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: var(--shadow);
	}

	.stat-icon {
		font-size: 2.5rem;
	}

	.stat-content h3 {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--primary);
		margin: 0;
	}

	.stat-sub {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.sessions-section,
	.insights-section {
		background: var(--surface);
		padding: 2rem;
		border-radius: var(--border-radius);
		margin-bottom: 2rem;
		box-shadow: var(--shadow);
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		padding: 2rem;
	}

	.sessions-list {
		display: grid;
		gap: 1rem;
	}

	.session-card {
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.25rem;
		transition: all 0.2s;
	}

	.session-card:hover {
		border-color: var(--primary);
		transform: translateX(4px);
	}

	.session-card.incomplete {
		opacity: 0.7;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.session-date {
		font-weight: 600;
		color: var(--text);
	}

	.session-status {
		font-size: 0.85rem;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		background: var(--surface-light);
		color: var(--text-secondary);
	}

	.session-status.completed {
		background: rgba(16, 185, 129, 0.2);
		color: var(--success);
	}

	.session-details {
		display: flex;
		gap: 2rem;
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-label {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.detail-value {
		font-weight: 600;
		color: var(--text);
	}

	.insight-card {
		background: var(--background);
		border-left: 4px solid var(--primary);
		padding: 1rem 1.5rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.insight-card.warning {
		border-left-color: var(--warning);
	}

	.insight-text {
		margin: 0;
		line-height: 1.6;
		color: var(--text);
	}

	.insight-text strong {
		color: var(--primary);
	}
</style>
