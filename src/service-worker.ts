/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Create a unique cache name for this version
const CACHE_NAME = `medistraction-cache-${version}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
	...build,  // App-generated files
	...files   // Static files in /static
];

// Cache for audio files
const AUDIO_CACHE = 'medistraction-audio-cache';

// Cache for API responses
const API_CACHE = 'medistraction-api-cache';

// Install event - cache static assets
sw.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker...');

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('[SW] Caching static assets');
			return cache.addAll(STATIC_ASSETS);
		}).then(() => {
			console.log('[SW] Service worker installed');
			return sw.skipWaiting();
		})
	);
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');

	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((cacheName) => {
						// Delete old version caches
						return cacheName.startsWith('medistraction-') && cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE && cacheName !== API_CACHE;
					})
					.map((cacheName) => {
						console.log('[SW] Deleting old cache:', cacheName);
						return caches.delete(cacheName);
					})
			);
		}).then(() => {
			console.log('[SW] Service worker activated');
			return sw.clients.claim();
		})
	);
});

// Fetch event - serve from cache when offline
sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip cross-origin requests
	if (url.origin !== self.location.origin && !url.origin.includes('127.0.0.1')) {
		return;
	}

	// Handle different types of requests
	if (request.method !== 'GET') {
		// For non-GET requests, try network only
		event.respondWith(fetch(request));
		return;
	}

	// Audio files - cache first strategy
	if (url.pathname.includes('/api/files/') || request.url.includes('audio')) {
		event.respondWith(
			caches.open(AUDIO_CACHE).then((cache) => {
				return cache.match(request).then((cachedResponse) => {
					if (cachedResponse) {
						console.log('[SW] Serving audio from cache:', url.pathname);
						return cachedResponse;
					}

					return fetch(request).then((response) => {
						// Cache successful audio responses
						if (response.ok) {
							cache.put(request, response.clone());
						}
						return response;
					}).catch(() => {
						// If offline and not in cache, return error
						return new Response('Audio not available offline', { status: 503 });
					});
				});
			})
		);
		return;
	}

	// API requests - network first, fallback to cache
	if (url.pathname.includes('/api/')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Cache successful API responses
					if (response.ok && request.method === 'GET') {
						const responseClone = response.clone();
						caches.open(API_CACHE).then((cache) => {
							cache.put(request, responseClone);
						});
					}
					return response;
				})
				.catch(() => {
					// Fallback to cache if offline
					return caches.match(request).then((cachedResponse) => {
						if (cachedResponse) {
							console.log('[SW] Serving API response from cache:', url.pathname);
							return cachedResponse;
						}
						// Return offline response
						return new Response(
							JSON.stringify({ error: 'offline', message: 'No network connection' }),
							{
								status: 503,
								headers: { 'Content-Type': 'application/json' }
							}
						);
					});
				})
		);
		return;
	}

	// Static assets - cache first strategy
	event.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}

				return fetch(request).then((response) => {
					// Cache successful responses
					if (response.ok) {
						cache.put(request, response.clone());
					}
					return response;
				}).catch(() => {
					// Fallback for navigation requests
					if (request.mode === 'navigate') {
						return cache.match('/');
					}
					return new Response('Offline', { status: 503 });
				});
			});
		})
	);
});

// Background sync for offline actions
sw.addEventListener('sync', (event) => {
	console.log('[SW] Background sync:', event.tag);

	if (event.tag === 'sync-sessions') {
		event.waitUntil(syncSessions());
	}
});

async function syncSessions() {
	// This will be called when connection is restored
	console.log('[SW] Syncing offline sessions...');

	// Send message to all clients to trigger sync
	const clients = await sw.clients.matchAll();
	clients.forEach((client) => {
		client.postMessage({
			type: 'SYNC_REQUEST',
			payload: { action: 'sync-sessions' }
		});
	});
}

// Listen for messages from the app
sw.addEventListener('message', (event) => {
	console.log('[SW] Message received:', event.data);

	if (event.data && event.data.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}

	if (event.data && event.data.type === 'CACHE_AUDIO') {
		const { url } = event.data.payload;
		caches.open(AUDIO_CACHE).then((cache) => {
			cache.add(url);
		});
	}
});

console.log('[SW] Service worker loaded');
