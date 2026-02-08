import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'development',
			strategies: 'injectManifest',
			filename: 'service-worker.ts',
			scope: '/',
			base: '/',
			selfDestroying: false,
			manifest: {
				short_name: 'MediTract',
				name: 'MediTract - Distraction Immunity Training',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: '#6366f1',
				background_color: '#1a1a2e',
				description: 'Train your mind to resist distractions through mindful meditation',
				icons: [
					{
						src: '/icon-192.png',
						type: 'image/png',
						sizes: '192x192'
					},
					{
						src: '/icon-512.png',
						type: 'image/png',
						sizes: '512x512'
					},
					{
						src: '/icon-512.png',
						type: 'image/png',
						sizes: '512x512',
						purpose: 'any maskable'
					}
				],
				categories: ['health', 'lifestyle', 'productivity'],
				shortcuts: [
					{
						name: 'Start Meditation',
						short_name: 'Meditate',
						description: 'Start a meditation session',
						url: '/',
						icons: [{ src: '/icon-192.png', sizes: '192x192' }]
					},
					{
						name: 'Upload Sounds',
						short_name: 'Sounds',
						description: 'Manage your distraction sounds',
						url: '/upload',
						icons: [{ src: '/icon-192.png', sizes: '192x192' }]
					}
				]
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			},
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: '/'
			}
		})
	]
});
