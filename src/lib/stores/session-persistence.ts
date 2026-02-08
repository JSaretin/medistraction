import { browser } from '$app/environment';
import type { SessionState } from './session';

const SESSION_STORAGE_KEY = 'medistraction_session_state';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface PersistedSessionState {
	isActive: boolean;
	isPaused: boolean;
	timeRemaining: number;
	soundsPlayed: number;
	startTime: number;
	nextSoundAt: number;
	config: SessionState['config'];
	lastSaved: number;
}

/**
 * Save the current session state to localStorage
 */
export function saveSessionState(state: SessionState): void {
	if (!browser) return;

	// Only save if there's an active session
	if (!state.isActive || state.startTime === null || state.nextSoundAt === null) {
		return;
	}

	const persistedState: PersistedSessionState = {
		isActive: state.isActive,
		isPaused: state.isPaused,
		timeRemaining: state.timeRemaining,
		soundsPlayed: state.soundsPlayed,
		startTime: state.startTime,
		nextSoundAt: state.nextSoundAt,
		config: state.config,
		lastSaved: Date.now()
	};

	try {
		localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedState));
	} catch (error) {
		console.error('Failed to save session state:', error);
	}
}

/**
 * Load and restore the session state from localStorage
 * Adjusts timestamps based on elapsed time since last save
 * Returns null if no valid session found or session is expired
 */
export function loadSessionState(): SessionState | null {
	if (!browser) return null;

	try {
		const stored = localStorage.getItem(SESSION_STORAGE_KEY);
		if (!stored) return null;

		const persisted: PersistedSessionState = JSON.parse(stored);

		// Check if session is expired (older than 24 hours)
		const now = Date.now();
		const elapsed = now - persisted.lastSaved;

		if (elapsed > MAX_SESSION_AGE) {
			console.log('Session expired, clearing...');
			clearSessionState();
			return null;
		}

		// Calculate adjusted time remaining
		const elapsedSeconds = Math.floor(elapsed / 1000);
		const adjustedTimeRemaining = Math.max(0, persisted.timeRemaining - elapsedSeconds);

		// If time ran out, clear the session
		if (adjustedTimeRemaining === 0) {
			console.log('Session time expired, clearing...');
			clearSessionState();
			return null;
		}

		// Adjust nextSoundAt timestamp
		const adjustedNextSoundAt = persisted.nextSoundAt + elapsed;

		// Restore the session state with adjusted values
		const restoredState: SessionState = {
			isActive: persisted.isActive,
			isPaused: persisted.isPaused,
			timeRemaining: adjustedTimeRemaining,
			soundsPlayed: persisted.soundsPlayed,
			startTime: persisted.startTime,
			nextSoundAt: adjustedNextSoundAt,
			config: persisted.config
		};

		return restoredState;
	} catch (error) {
		console.error('Failed to load session state:', error);
		clearSessionState();
		return null;
	}
}

/**
 * Clear the saved session state from localStorage
 */
export function clearSessionState(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(SESSION_STORAGE_KEY);
	} catch (error) {
		console.error('Failed to clear session state:', error);
	}
}

/**
 * Check if there's a saved session available
 */
export function hasSavedSession(): boolean {
	if (!browser) return false;

	try {
		const stored = localStorage.getItem(SESSION_STORAGE_KEY);
		if (!stored) return false;

		const persisted: PersistedSessionState = JSON.parse(stored);
		const now = Date.now();
		const elapsed = now - persisted.lastSaved;

		// Check if not expired and still has time remaining
		return elapsed < MAX_SESSION_AGE && persisted.timeRemaining > elapsed / 1000;
	} catch {
		return false;
	}
}
