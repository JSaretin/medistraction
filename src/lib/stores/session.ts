import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	saveSessionState,
	clearSessionState,
	loadSessionState
} from './session-persistence';

export interface Sound {
	id: string;
	name: string;
	url: string;
	file?: File;
	volume: number;
	playlists?: string[];
}

export interface SessionConfig {
	minWait: number; // seconds
	maxWait: number; // seconds
	sessionDuration: number; // minutes
	selectedSounds: Sound[];
	difficulty: 'easy' | 'medium' | 'hard';
	allowMultipleSounds: boolean;
	varyVolume: boolean;
}

export interface SessionState {
	isActive: boolean;
	isPaused: boolean;
	timeRemaining: number; // seconds
	soundsPlayed: number;
	startTime: number | null;
	nextSoundAt: number | null;
	config: SessionConfig;
}

const defaultConfig: SessionConfig = {
	minWait: 30,
	maxWait: 120,
	sessionDuration: 10,
	selectedSounds: [],
	difficulty: 'medium',
	allowMultipleSounds: false,
	varyVolume: false
};

const defaultState: SessionState = {
	isActive: false,
	isPaused: false,
	timeRemaining: 0,
	soundsPlayed: 0,
	startTime: null,
	nextSoundAt: null,
	config: defaultConfig
};

function createSessionStore() {
	const { subscribe, set, update } = writable<SessionState>(defaultState);

	// Auto-save session state on changes (only in browser)
	if (browser) {
		subscribe((state) => {
			if (state.isActive) {
				saveSessionState(state);
			}
		});
	}

	return {
		subscribe,
		startSession: (config: SessionConfig) => {
			const now = Date.now();
			const timeRemaining = config.sessionDuration * 60;
			const firstSoundDelay = getRandomDelay(config.minWait, config.maxWait);

			update((state) => ({
				...state,
				isActive: true,
				isPaused: false,
				timeRemaining,
				soundsPlayed: 0,
				startTime: now,
				nextSoundAt: now + firstSoundDelay * 1000,
				config
			}));
		},
		pauseSession: () => {
			update((state) => ({ ...state, isPaused: true }));
		},
		resumeSession: () => {
			update((state) => ({ ...state, isPaused: false }));
		},
		endSession: () => {
			clearSessionState();
			set(defaultState);
		},
		updateTime: (timeRemaining: number) => {
			update((state) => ({ ...state, timeRemaining }));
		},
		soundPlayed: () => {
			update((state) => {
				const now = Date.now();
				const nextDelay = getRandomDelay(state.config.minWait, state.config.maxWait);
				return {
					...state,
					soundsPlayed: state.soundsPlayed + 1,
					nextSoundAt: now + nextDelay * 1000
				};
			});
		},
		updateConfig: (config: Partial<SessionConfig>) => {
			update((state) => ({
				...state,
				config: { ...state.config, ...config }
			}));
		},
		restoreSession: (state: SessionState) => {
			set(state);
		}
	};
}

function getRandomDelay(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const sessionStore = createSessionStore();
