<script lang="ts">
	import { goto } from '$app/navigation';
	import { signup, login } from '$lib/pocketbase';

	let email = '';
	let password = '';
	let passwordConfirm = '';
	let name = '';
	let loading = false;
	let error = '';

	async function handleSignup() {
		if (!email || !password) {
			error = 'Please enter email and password';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		if (password !== passwordConfirm) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;
		error = '';

		try {
			await signup(email, password, name);
			// Auto login after signup
			await login(email, password);
			goto('/');
		} catch (err: any) {
			error = err.message || 'Failed to create account';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<div class="signup-card">
		<h1>🧘 Join Medistraction</h1>
		<p class="subtitle">Start your journey to distraction immunity</p>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleSignup}>
			<div class="form-group">
				<label for="name">Name (Optional)</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="Your name"
					disabled={loading}
				/>
			</div>

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
				<small>At least 8 characters</small>
			</div>

			<div class="form-group">
				<label for="passwordConfirm">Confirm Password</label>
				<input
					id="passwordConfirm"
					type="password"
					bind:value={passwordConfirm}
					placeholder="••••••••"
					required
					disabled={loading}
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{loading ? '⏳ Creating account...' : '🚀 Create Account'}
			</button>
		</form>

		<div class="footer">
			<p>Already have an account? <a href="/login">Sign in</a></p>
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

	.signup-card {
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

	small {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
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
