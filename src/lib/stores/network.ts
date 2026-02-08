import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Online/offline status store
function createNetworkStore() {
	const { subscribe, set } = writable(browser ? navigator.onLine : true);

	if (browser) {
		// Listen for online/offline events
		window.addEventListener('online', () => {
			console.log('[Network] Connection restored');
			set(true);
		});

		window.addEventListener('offline', () => {
			console.log('[Network] Connection lost');
			set(false);
		});

		// Poll network status periodically as backup
		setInterval(() => {
			set(navigator.onLine);
		}, 30000); // Check every 30 seconds
	}

	return {
		subscribe,
		set
	};
}

export const isOnline = createNetworkStore();
export const isOffline = derived(isOnline, ($isOnline) => !$isOnline);

// Installation status
export const isInstalled = writable(false);

// Check if app is installed (running as PWA)
if (browser) {
	const checkInstalled = () => {
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone ||
			document.referrer.includes('android-app://');

		isInstalled.set(isStandalone);
	};

	checkInstalled();
	window.addEventListener('appinstalled', () => {
		isInstalled.set(true);
	});
}

// Service Worker registration status
export const swRegistration = writable<ServiceWorkerRegistration | null>(null);
export const swUpdateAvailable = writable(false);

// Register service worker
if (browser && 'serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js', {
				scope: '/'
			});

			console.log('[SW] Service Worker registered:', registration);
			swRegistration.set(registration);

			// Check for updates
			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('[SW] Update available');
							swUpdateAvailable.set(true);
						}
					});
				}
			});

			// Check for updates periodically
			setInterval(
				() => {
					registration.update();
				},
				60 * 60 * 1000
			); // Check every hour
		} catch (error) {
			console.error('[SW] Service Worker registration failed:', error);
		}
	});
}

// Update service worker
export async function updateServiceWorker() {
	const registration = await navigator.serviceWorker.getRegistration();
	if (registration && registration.waiting) {
		registration.waiting.postMessage({ type: 'SKIP_WAITING' });
		window.location.reload();
	}
}

// Cache audio file via service worker
export function cacheAudioFile(url: string) {
	if (browser && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			type: 'CACHE_AUDIO',
			payload: { url }
		});
	}
}
