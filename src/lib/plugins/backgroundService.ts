import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface TimerEvent {
  eventType: 'TIMER_UPDATE' | 'PLAY_SOUND' | 'SESSION_ENDED';
  timeRemaining: number;
  soundsPlayed: number;
}

export interface BackgroundServicePlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  configureAudio(): Promise<{ success: boolean }>;
  updateNotification(options: { timeRemaining: number; soundsPlayed: number }): Promise<void>;
  startSession(options: { duration: number; minWait: number; maxWait: number }): Promise<void>;
  addListener(eventName: 'timerEvent', listenerFunc: (event: TimerEvent) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService', {
  web: () => {
    // Web implementation (no-op for web platform)
    return {
      start: async () => {
        console.log('BackgroundService.start() - web platform (no-op)');
      },
      stop: async () => {
        console.log('BackgroundService.stop() - web platform (no-op)');
      },
      configureAudio: async () => {
        console.log('BackgroundService.configureAudio() - web platform (no-op)');
        return { success: true };
      },
      updateNotification: async () => {
        console.log('BackgroundService.updateNotification() - web platform (no-op)');
      },
      startSession: async () => {
        console.log('BackgroundService.startSession() - web platform (no-op)');
      },
      addListener: async () => {
        console.log('BackgroundService.addListener() - web platform (no-op)');
        return { remove: async () => {} };
      },
      removeAllListeners: async () => {
        console.log('BackgroundService.removeAllListeners() - web platform (no-op)');
      }
    };
  }
});

export default BackgroundService;
