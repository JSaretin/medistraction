import PocketBase from 'pocketbase';
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { isOnline } from './stores/network';
import {
	initDB,
	saveSoundOffline,
	getSoundsOffline,
	deleteSoundOffline,
	saveSessionOffline,
	getSessionsOffline,
	addToSyncQueue,
	getSyncQueue,
	markSynced,
	cacheAudioFromURL,
	getAudioURL
} from './offline-storage';

// Initialize PocketBase client
export const pb = new PocketBase(PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Disable auto cancellation for better UX
pb.autoCancellation(false);

// Initialize IndexedDB (only in browser)
if (browser) {
	initDB().catch((err) => console.error('Failed to initialize IndexedDB:', err));
}

// Create a writable store for the current user
export const currentUser = writable(pb.authStore.model);

// Listen to auth changes
pb.authStore.onChange((auth) => {
	currentUser.set(pb.authStore.model);
});

// Type definitions for PocketBase collections
export interface Playlist {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	user: string; // Relation to users
	created: string;
	updated: string;
}

export interface Sound {
	id: string;
	name: string;
	file: string; // File field
	size: number;
	volume: number;
	playlists: string[]; // Array of playlist IDs (many-to-many relation)
	expand?: {
		playlists?: Playlist[];
	};
	user: string; // Relation to users
	created: string;
	updated: string;
}

export interface Session {
	id: string;
	user: string; // Relation to users
	duration: number; // minutes
	sounds_played: number;
	completed: boolean;
	config: {
		minWait: number;
		maxWait: number;
		difficulty: string;
		allowMultipleSounds: boolean;
		varyVolume: boolean;
	};
	created: string;
	updated: string;
}

export interface User {
	id: string;
	email: string;
	name?: string;
	avatar?: string;
	created: string;
	updated: string;
}

// Helper functions
export async function login(email: string, password: string) {
	return await pb.collection('users').authWithPassword(email, password);
}

export async function signup(email: string, password: string, name?: string) {
	const data = {
		email,
		password,
		passwordConfirm: password,
		name: name || email.split('@')[0]
	};
	return await pb.collection('users').create(data);
}

export function logout() {
	pb.authStore.clear();
}

export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

export function getCurrentUser() {
	return pb.authStore.model;
}

// Get file URL
export function getFileUrl(record: any, filename: string): string {
	return pb.files.getUrl(record, filename);
}

// Sounds helpers
export async function getUserSounds(): Promise<Sound[]> {
	const userId = pb.authStore.model?.id;
	if (!userId) return [];

	// Try online first
	if (get(isOnline)) {
		try {
			const sounds = await pb.collection('sounds').getFullList<Sound>({
				filter: `user = "${userId}"`,
				sort: '-created',
				expand: 'playlists'
			});

			// Cache sounds offline
			for (const sound of sounds) {
				await saveSoundOffline(sound);
				// Cache audio files
				if (sound.file) {
					const audioUrl = getFileUrl(sound, sound.file);
					await cacheAudioFromURL(sound.id, audioUrl);
				}
			}

			return sounds;
		} catch (error) {
			console.log('Failed to fetch sounds online, falling back to offline cache:', error);
		}
	}

	// Fallback to offline cache
	return await getSoundsOffline(userId);
}

export async function uploadSound(file: File, name: string, volume: number = 0.7, playlistIds: string[] = []): Promise<Sound> {
	const userId = pb.authStore.model?.id;
	if (!userId) throw new Error('Not authenticated');

	const formData = new FormData();
	formData.append('name', name);
	formData.append('file', file);
	formData.append('size', file.size.toString());
	formData.append('volume', volume.toString());
	// Add multiple playlist IDs
	playlistIds.forEach(playlistId => {
		formData.append('playlists', playlistId);
	});
	formData.append('user', userId);

	// Try online first
	if (get(isOnline)) {
		try {
			const sound = await pb.collection('sounds').create<Sound>(formData);
			await saveSoundOffline(sound);
			return sound;
		} catch (error) {
			console.log('Failed to upload sound online, queueing for sync:', error);
		}
	}

	// If offline, create temporary record and queue for sync
	const tempSound: Sound = {
		id: 'temp_' + Date.now(),
		name,
		file: file.name,
		size: file.size,
		volume,
		playlists: playlistIds,
		user: userId,
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	};

	await saveSoundOffline(tempSound);
	await addToSyncQueue({
		type: 'create',
		collection: 'sounds',
		data: { name, file, size: file.size, volume, playlists: playlistIds, user: userId }
	});

	return tempSound;
}

export async function updateSound(soundId: string, data: Partial<Sound>): Promise<Sound> {
	return await pb.collection('sounds').update<Sound>(soundId, data);
}

export async function deleteSound(soundId: string): Promise<boolean> {
	// Delete from offline cache first
	await deleteSoundOffline(soundId);

	// Try online deletion
	if (get(isOnline)) {
		try {
			return await pb.collection('sounds').delete(soundId);
		} catch (error) {
			console.log('Failed to delete sound online, queueing for sync:', error);
			await addToSyncQueue({
				type: 'delete',
				collection: 'sounds',
				data: { id: soundId }
			});
		}
	} else {
		// Queue for sync when online
		await addToSyncQueue({
			type: 'delete',
			collection: 'sounds',
			data: { id: soundId }
		});
	}

	return true;
}

// Playlists helpers
export async function getUserPlaylists(): Promise<Playlist[]> {
	const userId = pb.authStore.model?.id;
	if (!userId) return [];

	try {
		const playlists = await pb.collection('playlists').getFullList<Playlist>({
			filter: `user = "${userId}"`,
			sort: 'name'
		});
		return playlists;
	} catch (error) {
		console.error('Error loading playlists:', error);
		return [];
	}
}

export async function createPlaylist(name: string, description?: string, icon?: string): Promise<Playlist> {
	const userId = pb.authStore.model?.id;
	if (!userId) {
		console.error('Create playlist failed: Not authenticated');
		throw new Error('Not authenticated');
	}

	const data: any = {
		name,
		user: userId
	};

	// Only add optional fields if provided
	if (description) data.description = description;
	if (icon) data.icon = icon;

	console.log('Creating playlist with data:', data);

	try {
		const result = await pb.collection('playlists').create<Playlist>(data);
		console.log('Playlist created successfully:', result);
		return result;
	} catch (error: any) {
		console.error('Create playlist error:', error);
		console.error('Error response:', error.response);
		throw error;
	}
}

export async function updatePlaylist(playlistId: string, data: Partial<Playlist>): Promise<Playlist> {
	return await pb.collection('playlists').update<Playlist>(playlistId, data);
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
	try {
		return await pb.collection('playlists').delete(playlistId);
	} catch (error) {
		console.error('Failed to delete playlist:', error);
		return false;
	}
}

// Sessions helpers
export async function getUserSessions(): Promise<Session[]> {
	const userId = pb.authStore.model?.id;
	if (!userId) return [];

	// Try online first
	if (get(isOnline)) {
		try {
			const sessions = await pb.collection('sessions').getFullList<Session>({
				filter: `user = "${userId}"`,
				sort: '-created'
			});

			// Cache sessions offline
			for (const session of sessions) {
				await saveSessionOffline(session);
			}

			return sessions;
		} catch (error) {
			console.log('Failed to fetch sessions online, falling back to offline cache:', error);
		}
	}

	// Fallback to offline cache
	return await getSessionsOffline(userId);
}

export async function createSession(sessionData: {
	duration: number;
	sounds_played: number;
	completed: boolean;
	config: any;
}): Promise<Session> {
	const userId = pb.authStore.model?.id;
	if (!userId) throw new Error('Not authenticated');

	const sessionWithUser = {
		...sessionData,
		user: userId
	};

	// Try online first
	if (get(isOnline)) {
		try {
			const session = await pb.collection('sessions').create<Session>(sessionWithUser);
			await saveSessionOffline(session);
			return session;
		} catch (error) {
			console.log('Failed to create session online, saving offline:', error);
		}
	}

	// If offline, create temporary record and queue for sync
	const tempSession: Session = {
		id: 'temp_' + Date.now(),
		...sessionWithUser,
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	};

	await saveSessionOffline(tempSession);
	await addToSyncQueue({
		type: 'create',
		collection: 'sessions',
		data: sessionWithUser
	});

	return tempSession;
}

export async function updateSession(sessionId: string, data: Partial<Session>): Promise<Session> {
	return await pb.collection('sessions').update<Session>(sessionId, data);
}

// Sync offline data with server
export async function syncOfflineData(): Promise<{ success: number; failed: number }> {
	if (!get(isOnline)) {
		console.log('Cannot sync: offline');
		return { success: 0, failed: 0 };
	}

	const queue = await getSyncQueue();
	console.log(`Syncing ${queue.length} operations...`);

	let success = 0;
	let failed = 0;

	for (const operation of queue) {
		try {
			if (operation.type === 'create') {
				await pb.collection(operation.collection).create(operation.data);
			} else if (operation.type === 'update') {
				await pb.collection(operation.collection).update(operation.data.id, operation.data);
			} else if (operation.type === 'delete') {
				await pb.collection(operation.collection).delete(operation.data.id);
			}

			// Mark as synced and remove from queue
			await markSynced(operation.id);
			success++;
		} catch (error) {
			console.error(`Failed to sync operation ${operation.id}:`, error);
			failed++;
		}
	}

	console.log(`Sync complete: ${success} succeeded, ${failed} failed`);
	return { success, failed };
}

// Listen for online events and auto-sync
if (browser) {
	isOnline.subscribe((online) => {
		if (online) {
			console.log('Connection restored, syncing offline data...');
			syncOfflineData().catch((err) => console.error('Auto-sync failed:', err));
		}
	});
}
