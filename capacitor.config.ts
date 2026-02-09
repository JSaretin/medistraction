import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medistraction.app',
  appName: 'Medistraction',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f23',
      showSpinner: false
    },
    NativeAudio: {
      fade: true,
      focus: true,
      preload: true
    }
  }
};

export default config;
