<script lang="ts">
	import { onMount } from 'svelte';
	import Timer from '$lib/components/Timer.svelte';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';
	import SessionControls from '$lib/components/SessionControls.svelte';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import SessionRestorer from '$lib/components/SessionRestorer.svelte';
	import { sessionStore } from '$lib/stores/session';
	import { currentUser, logout, isAuthenticated } from '$lib/pocketbase';
	import { goto } from '$app/navigation';

	let showUserMenu = false;

	onMount(() => {
		// Close menu when clicking outside
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (showUserMenu && !target.closest('.user-profile')) {
				showUserMenu = false;
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function handleLogout() {
		logout();
		showUserMenu = false;
		goto('/login');
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}

	function getInitials(email: string): string {
		return email.charAt(0).toUpperCase();
	}
</script>

<!-- Offline/Update Indicator -->
<OfflineIndicator />

<!-- Install Prompt -->
<InstallPrompt />

<!-- Session Restorer -->
<SessionRestorer />

<!-- Top Navigation Bar -->
<nav class="top-nav">
	<div class="nav-container">
		<a href="/" class="logo-small">🧘</a>

		<div class="nav-right">
			{#if isAuthenticated()}
				<div class="user-profile">
					<button class="profile-btn" on:click={toggleUserMenu}>
						<div class="avatar">
							{getInitials($currentUser?.email || '')}
						</div>
					</button>

					{#if showUserMenu}
						<div class="user-menu">
							<div class="menu-header">
								<div class="avatar-large">
									{getInitials($currentUser?.email || '')}
								</div>
								<div class="user-info">
									<span class="user-name">{$currentUser?.name || 'User'}</span>
									<span class="user-email-full">{$currentUser?.email}</span>
								</div>
							</div>
							<div class="menu-divider"></div>
							<a href="/dashboard" class="menu-item" on:click={() => (showUserMenu = false)}>
								<span class="menu-icon">📊</span>
								Dashboard
							</a>
							<a href="/upload" class="menu-item" on:click={() => (showUserMenu = false)}>
								<span class="menu-icon">🔊</span>
								Sounds
							</a>
							<div class="menu-divider"></div>
							<button class="menu-item logout" on:click={handleLogout}>
								<span class="menu-icon">🚪</span>
								Logout
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="auth-buttons">
					<a href="/login" class="auth-btn">Login</a>
					<a href="/signup" class="auth-btn primary">Sign Up</a>
				</div>
			{/if}
		</div>
	</div>
</nav>

<main>
	<header>
		<h1>🧘 MediTract</h1>
		<p class="tagline">Train Your Mind to Resist Distractions</p>
	</header>

	<div class="container">
		{#if $sessionStore.isActive}
			<Timer />
			<SoundPlayer />
		{:else}
			<SessionControls />
		{/if}
	</div>

	<nav class="bottom-nav">
		<a href="/" class="nav-btn">
			<span class="nav-icon">🏠</span>
			<span class="nav-label">Home</span>
		</a>
		<a href="/upload" class="nav-btn">
			<span class="nav-icon">🔊</span>
			<span class="nav-label">Sounds</span>
		</a>
		<a href="/dashboard" class="nav-btn">
			<span class="nav-icon">📊</span>
			<span class="nav-label">Progress</span>
		</a>
	</nav>
</main>

<style>
	/* Top Navigation Bar */
	.top-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		z-index: 1000;
		backdrop-filter: blur(10px);
		background: rgba(26, 26, 46, 0.95);
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo-small {
		font-size: 1.5rem;
		text-decoration: none;
		transition: transform 0.2s;
	}

	.logo-small:hover {
		transform: scale(1.1);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 6rem 1rem 6rem;
		max-width: 600px;
		margin: 0 auto;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	/* User Profile Section */
	.user-profile {
		position: relative;
	}

	.profile-btn {
		width: 40px;
		height: 40px;
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.profile-btn:hover .avatar {
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 1rem;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	/* User Menu Dropdown */
	.user-menu {
		position: absolute;
		top: calc(100% + 0.75rem);
		right: 0;
		min-width: 260px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.menu-header {
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--background);
	}

	.avatar-large {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow: hidden;
	}

	.user-name {
		font-weight: 600;
		color: var(--text);
		font-size: 0.95rem;
	}

	.user-email-full {
		font-size: 0.85rem;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.menu-divider {
		height: 1px;
		background: var(--border);
		margin: 0.5rem 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
		background: transparent;
		width: 100%;
		text-align: left;
		font-size: 0.95rem;
	}

	.menu-item:hover {
		background: var(--surface-light);
	}

	.menu-item.logout {
		color: var(--danger);
	}

	.menu-item.logout:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.menu-icon {
		font-size: 1.1rem;
	}

	/* Auth Buttons (Not Logged In) */
	.auth-buttons {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.auth-btn {
		padding: 0.5rem 1.25rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 20px;
		color: var(--text);
		text-decoration: none;
		font-size: 0.9rem;
		transition: all 0.2s;
		display: inline-block;
		font-weight: 500;
	}

	.auth-btn:hover {
		background: var(--surface-light);
		border-color: var(--primary);
	}

	.auth-btn.primary {
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		border: none;
		color: white;
	}

	.auth-btn.primary:hover {
		box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
		transform: translateY(-1px);
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.tagline {
		color: var(--text-secondary);
		font-size: 1rem;
		margin-bottom: 2rem;
	}

	/* Mobile Responsive */
	@media (max-width: 600px) {
		.nav-container {
			padding: 0.75rem 1rem;
		}

		main {
			padding: 5rem 1rem 6rem;
		}

		h1 {
			font-size: 2rem;
		}

		.tagline {
			font-size: 0.9rem;
		}

		.user-menu {
			right: 1rem;
		}
	}

	@media (max-width: 400px) {
		.auth-btn {
			padding: 0.5rem 1rem;
			font-size: 0.85rem;
		}

		.nav-label {
			font-size: 0.7rem;
		}
	}

	.container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--surface);
		border-top: 1px solid var(--border);
		display: flex;
		justify-content: space-around;
		padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
		z-index: 100;
		backdrop-filter: blur(10px);
		background: rgba(26, 26, 46, 0.95);
	}

	.nav-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		text-decoration: none;
		transition: all 0.2s;
		font-size: 0.75rem;
		min-width: 80px;
	}

	.nav-btn:hover {
		color: var(--primary);
		transform: translateY(-2px);
	}

	.nav-icon {
		font-size: 1.5rem;
	}

	.nav-label {
		font-size: 0.75rem;
		font-weight: 500;
	}
</style>
