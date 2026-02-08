// IndexedDB wrapper for offline storage

import { browser } from '$app/environment';

const DB_NAME = 'meditract-db';
const DB_VERSION = 1;

// Store names
const STORES = {
	SOUNDS: 'sounds',
	SESSIONS: 'sessions',
	AUDIO_FILES: 'audio_files',
	SYNC_QUEUE: 'sync_queue'
};

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
	// Only run in browser
	if (!browser) {
		throw new Error('IndexedDB is only available in the browser');
	}

	if (db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;

			// Sounds store
			if (!database.objectStoreNames.contains(STORES.SOUNDS)) {
				const soundStore = database.createObjectStore(STORES.SOUNDS, { keyPath: 'id' });
				soundStore.createIndex('user', 'user', { unique: false });
				soundStore.createIndex('created', 'created', { unique: false });
			}

			// Sessions store
			if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
				const sessionStore = database.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
				sessionStore.createIndex('user', 'user', { unique: false });
				sessionStore.createIndex('created', 'created', { unique: false });
			}

			// Audio files store (for storing actual audio data)
			if (!database.objectStoreNames.contains(STORES.AUDIO_FILES)) {
				database.createObjectStore(STORES.AUDIO_FILES, { keyPath: 'id' });
			}

			// Sync queue store (for operations to sync when online)
			if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
				const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, {
					keyPath: 'id',
					autoIncrement: true
				});
				syncStore.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// Generic helper to perform IndexedDB operations
async function performDBOperation<T>(
	storeName: string,
	operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
	if (!browser) {
		throw new Error('IndexedDB operations are only available in the browser');
	}

	const database = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = operation(store);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

// Sounds operations
export async function saveSoundOffline(sound: any): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SOUNDS, (store) => store.put(sound));
}

export async function getSoundsOffline(userId: string): Promise<any[]> {
	if (!browser) return [];
	const database = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORES.SOUNDS, 'readonly');
		const store = transaction.objectStore(STORES.SOUNDS);
		const index = store.index('user');
		const request = index.getAll(userId);

		request.onsuccess = () => resolve(request.result || []);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteSoundOffline(soundId: string): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SOUNDS, (store) => store.delete(soundId));
}

// Audio file operations
export async function saveAudioFile(id: string, audioBlob: Blob): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.AUDIO_FILES, (store) =>
		store.put({ id, data: audioBlob, timestamp: Date.now() })
	);
}

export async function getAudioFile(id: string): Promise<Blob | null> {
	if (!browser) return null;
	try {
		const result = await performDBOperation<any>(STORES.AUDIO_FILES, (store) => store.get(id));
		return result ? result.data : null;
	} catch {
		return null;
	}
}

// Session operations
export async function saveSessionOffline(session: any): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SESSIONS, (store) => store.put(session));
}

export async function getSessionsOffline(userId: string): Promise<any[]> {
	if (!browser) return [];
	const database = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORES.SESSIONS, 'readonly');
		const store = transaction.objectStore(STORES.SESSIONS);
		const index = store.index('user');
		const request = index.getAll(userId);

		request.onsuccess = () => {
			const sessions = request.result || [];
			// Sort by created date descending
			sessions.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
			resolve(sessions);
		};
		request.onerror = () => reject(request.error);
	});
}

// Sync queue operations
export async function addToSyncQueue(operation: {
	type: 'create' | 'update' | 'delete';
	collection: string;
	data: any;
}): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SYNC_QUEUE, (store) =>
		store.add({
			...operation,
			timestamp: Date.now(),
			synced: false
		})
	);
}

export async function getSyncQueue(): Promise<any[]> {
	if (!browser) return [];
	const database = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORES.SYNC_QUEUE, 'readonly');
		const store = transaction.objectStore(STORES.SYNC_QUEUE);
		const request = store.getAll();

		request.onsuccess = () => resolve(request.result || []);
		request.onerror = () => reject(request.error);
	});
}

export async function markSynced(queueId: number): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SYNC_QUEUE, (store) => store.delete(queueId));
}

export async function clearSyncQueue(): Promise<void> {
	if (!browser) return;
	await performDBOperation(STORES.SYNC_QUEUE, (store) => store.clear());
}

// Cache audio from URL
export async function cacheAudioFromURL(id: string, url: string): Promise<void> {
	if (!browser) return;
	try {
		const response = await fetch(url);
		if (response.ok) {
			const blob = await response.blob();
			await saveAudioFile(id, blob);
		}
	} catch (error) {
		console.error('Failed to cache audio:', error);
	}
}

// Get audio URL (from cache or original URL)
export async function getAudioURL(id: string, originalUrl: string): Promise<string> {
	if (!browser) return originalUrl;
	const cachedBlob = await getAudioFile(id);
	if (cachedBlob) {
		return URL.createObjectURL(cachedBlob);
	}
	// If not cached, try to cache it for next time
	cacheAudioFromURL(id, originalUrl).catch(() => {});
	return originalUrl;
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
	if (!browser) return;
	const database = await initDB();
	const storeNames = [STORES.SOUNDS, STORES.SESSIONS, STORES.AUDIO_FILES, STORES.SYNC_QUEUE];

	for (const storeName of storeNames) {
		await performDBOperation(storeName, (store) => store.clear());
	}
}

// Get storage stats
export async function getStorageStats(): Promise<{
	sounds: number;
	sessions: number;
	audioFiles: number;
	syncQueue: number;
}> {
	if (!browser) return { sounds: 0, sessions: 0, audioFiles: 0, syncQueue: 0 };
	const database = await initDB();

	const countStore = async (storeName: string): Promise<number> => {
		return new Promise((resolve, reject) => {
			const transaction = database.transaction(storeName, 'readonly');
			const store = transaction.objectStore(storeName);
			const request = store.count();

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	};

	return {
		sounds: await countStore(STORES.SOUNDS),
		sessions: await countStore(STORES.SESSIONS),
		audioFiles: await countStore(STORES.AUDIO_FILES),
		syncQueue: await countStore(STORES.SYNC_QUEUE)
	};
}
