import { registerPlugin } from '@capacitor/core';

export interface SimpleAudioPlayerPlugin {
  preload(options: { assetId: string; url: string }): Promise<void>;
  play(options: { assetId: string }): Promise<void>;
  setVolume(options: { assetId: string; volume: number }): Promise<void>;
  stop(options: { assetId: string }): Promise<void>;
  unload(options: { assetId: string }): Promise<void>;
}

const SimpleAudioPlayer = registerPlugin<SimpleAudioPlayerPlugin>('SimpleAudioPlayer', {
  web: () => {
    // Web fallback uses HTML5 Audio
    const players = new Map<string, HTMLAudioElement>();

    return {
      preload: async (options) => {
        const audio = new Audio(options.url);
        audio.preload = 'auto';
        players.set(options.assetId, audio);
      },
      play: async (options) => {
        const audio = players.get(options.assetId);
        if (audio) {
          audio.currentTime = 0;
          await audio.play();
        }
      },
      setVolume: async (options) => {
        const audio = players.get(options.assetId);
        if (audio) {
          audio.volume = options.volume;
        }
      },
      stop: async (options) => {
        const audio = players.get(options.assetId);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      },
      unload: async (options) => {
        const audio = players.get(options.assetId);
        if (audio) {
          audio.pause();
          audio.src = '';
          players.delete(options.assetId);
        }
      }
    };
  }
});

export default SimpleAudioPlayer;
