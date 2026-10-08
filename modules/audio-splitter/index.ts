import { requireOptionalNativeModule } from 'expo';

type AudioSplitterModule = {
  split(sourceUri: string, outputDirUri: string, partSeconds: number): Promise<string[]>;
};

// null in Expo Go, because Expo Go does not include ech0's own native code.
const native = requireOptionalNativeModule<AudioSplitterModule>('AudioSplitter');

/** True in ech0's own build, false in Expo Go. */
export const canSplitAudio = native !== null;

/** Cuts the audio into .m4a parts of at most `partSeconds` seconds, and returns their URIs in order. */
export function splitAudio(sourceUri: string, outputDirUri: string, partSeconds: number): Promise<string[]> {
  if (!native) return Promise.reject(new Error("Cutting long audio needs ech0's own build, not Expo Go."));
  return native.split(sourceUri, outputDirUri, partSeconds);
}
