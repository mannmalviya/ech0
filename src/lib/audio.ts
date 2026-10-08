import { createAudioPlayer } from 'expo-audio';

/** Loads an audio file and returns its length in seconds (0 if it cannot be read in 10 seconds). */
export function readDuration(uri: string): Promise<number> {
  return new Promise((resolve) => {
    const player = createAudioPlayer(uri);
    let finished = false;
    const finish = (seconds: number) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      subscription.remove();
      player.remove();
      resolve(seconds);
    };
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.duration > 0) finish(status.duration);
    });
    const timer = setTimeout(() => finish(player.duration || 0), 10_000);
  });
}
