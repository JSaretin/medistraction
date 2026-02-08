import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { sessionStore } from './session';
import { saveSessionState } from './session-persistence';

/**
 * Initialize page lifecycle event handlers
 * Saves session state when the page is hidden, unloaded, or visibility changes
 */
export function initPageLifecycleHandlers(): void {
	if (!browser) return;

	// Save on visibility change (when app is minimized or switched away)
	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Save before page unload (browser close/refresh)
	window.addEventListener('beforeunload', handleBeforeUnload);

	// Save on pagehide (iOS Safari support)
	window.addEventListener('pagehide', handlePageHide);
}

/**
 * Handle visibility change events
 * Triggered when user switches tabs or minimizes the app
 */
function handleVisibilityChange(): void {
	if (document.hidden) {
		const state = get(sessionStore);
		if (state.isActive) {
			console.log('Page hidden, saving session state...');
			saveSessionState(state);
		}
	}
}

/**
 * Handle before unload events
 * Triggered when user closes the tab or refreshes
 */
function handleBeforeUnload(): void {
	const state = get(sessionStore);
	if (state.isActive) {
		console.log('Page unloading, saving session state...');
		saveSessionState(state);
	}
}

/**
 * Handle page hide events
 * iOS Safari specific - triggered when page is hidden
 */
function handlePageHide(): void {
	const state = get(sessionStore);
	if (state.isActive) {
		console.log('Page hiding, saving session state...');
		saveSessionState(state);
	}
}

/**
 * Clean up event listeners
 */
export function cleanupPageLifecycleHandlers(): void {
	if (!browser) return;

	document.removeEventListener('visibilitychange', handleVisibilityChange);
	window.removeEventListener('beforeunload', handleBeforeUnload);
	window.removeEventListener('pagehide', handlePageHide);
}
