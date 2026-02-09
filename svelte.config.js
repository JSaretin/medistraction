import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Determine which adapter to use based on environment
// ADAPTER=static for Capacitor/APK builds (default)
// ADAPTER=vercel for Vercel deployments
const adapterType = process.env.ADAPTER || 'static';

const getAdapter = () => {
	if (adapterType === 'vercel') {
		console.log('📦 Using Vercel adapter for deployment');
		return adapterVercel();
	}

	console.log('📱 Using Static adapter for Capacitor/APK build');
	return adapterStatic({
		pages: 'build',
		assets: 'build',
		fallback: 'index.html',
		precompress: false,
		strict: false
	});
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: getAdapter()
	}
};

export default config;
