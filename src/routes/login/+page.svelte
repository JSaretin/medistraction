<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, currentUser } from '$lib/pocketbase';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleLogin() {
		if (!email || !password) {
			error = 'Please enter email and password';
			return;
		}

		loading = true;
		error = '';

		try {
			await login(email, password);
			goto('/');
		} catch (err: any) {
			error = err.message || 'Invalid email or password';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<div class="login-card">
		<h1>🧘 Welcome Back</h1>
		<p class="subtitle">Sign in to continue your meditation practice</p>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleLogin}>
			<div class="form-group">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
					disabled={loading}
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{loading ? '⏳ Signing in...' : '🔑 Sign In'}
			</button>
		</form>

		<div class="footer">
			<p>Don't have an account? <a href="/signup">Sign up</a></p>
			<p class="demo-note">Or continue without login to try demo mode</p>
			<a href="/" class="demo-link">← Back to home</a>
		</div>
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: var(--surface);
		padding: 2.5rem;
		border-radius: var(--border-radius);
		box-shadow: var(--shadow);
	}

	h1 {
		text-align: center;
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		font-size: 0.95rem;
	}

	.error-message {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		border-radius: 8px;
		color: var(--danger);
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	input {
		width: 100%;
		padding: 0.75rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: var(--primary);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-btn {
		width: 100%;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		border: none;
		border-radius: var(--border-radius);
		color: white;
		font-size: 1rem;
		font-weight: 600;
		transition: all 0.3s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.footer {
		margin-top: 2rem;
		text-align: center;
	}

	.footer p {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.footer a {
		color: var(--primary);
		text-decoration: none;
		font-weight: 500;
	}

	.footer a:hover {
		text-decoration: underline;
	}

	.demo-note {
		font-size: 0.85rem !important;
		margin-top: 1rem;
	}

	.demo-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}
</style>
