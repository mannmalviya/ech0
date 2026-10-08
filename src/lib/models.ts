// Speech-to-text models, their prices, and their limits.
// Prices from https://developers.openai.com/api/docs/pricing (October 2026). Update them here.

export type ModelId =
  | 'gpt-transcribe'
  | 'gpt-4o-transcribe'
  | 'gpt-4o-mini-transcribe'
  | 'gpt-4o-transcribe-diarize'
  | 'whisper-1';

/** What times the model gives back, for highlight while playing. */
export type Timing = 'none' | 'turns' | 'words';

export type ModelInfo = {
  id: ModelId;
  pricePerMinute: number;
  /** Longest audio the model accepts in one request, or null for no limit. */
  maxSeconds: number | null;
  timing: Timing;
};

export const MODELS: ModelInfo[] = [
  { id: 'gpt-transcribe', pricePerMinute: 0.0045, maxSeconds: 1500, timing: 'none' },
  { id: 'gpt-4o-transcribe', pricePerMinute: 0.006, maxSeconds: 1500, timing: 'none' },
  { id: 'gpt-4o-mini-transcribe', pricePerMinute: 0.003, maxSeconds: 1500, timing: 'none' },
  { id: 'gpt-4o-transcribe-diarize', pricePerMinute: 0.006, maxSeconds: 1500, timing: 'turns' },
  { id: 'whisper-1', pricePerMinute: 0.006, maxSeconds: null, timing: 'words' },
];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Longest audio the gpt-* models accept in one request. */
export const MAX_REQUEST_SECONDS = 1500;
/** Long audio is cut into parts of this length (20 minutes), under the 25-minute limit. */
export const PART_SECONDS = 1200;

export function getModel(id: ModelId): ModelInfo {
  return MODELS.find((m) => m.id === id)!;
}

export function estimateCost(durationSec: number, models: ModelId[]): number {
  const minutes = durationSec / 60;
  return models.reduce((sum, id) => sum + minutes * getModel(id).pricePerMinute, 0);
}

/** "$0.13" for normal amounts; more digits for very small amounts, so they do not show as $0.00. */
export function formatUsd(amount: number): string {
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

/** True if the audio is too long or too big for one request, so it must be cut into parts. */
export function needsParts(durationSec: number, sizeBytes: number): boolean {
  return durationSec > MAX_REQUEST_SECONDS || sizeBytes > MAX_UPLOAD_BYTES;
}

/** Length in seconds of each part. Audio that fits one request is one part. */
export function partLengths(durationSec: number, sizeBytes: number): number[] {
  if (!needsParts(durationSec, sizeBytes)) return [durationSec];
  const lengths: number[] = [];
  for (let start = 0; start < durationSec; start += PART_SECONDS) {
    lengths.push(Math.min(PART_SECONDS, durationSec - start));
  }
  return lengths;
}

/**
 * Why a model cannot transcribe this audio, or null if it can.
 * `canSplit` is true in ech0's own build, which cuts long audio into parts. Expo Go cannot.
 */
export function modelProblem(id: ModelId, durationSec: number, sizeBytes: number, canSplit: boolean): string | null {
  if (canSplit) return null;
  if (sizeBytes > MAX_UPLOAD_BYTES) return 'Over 25 MB. Needs the own build';
  const { maxSeconds } = getModel(id);
  if (maxSeconds !== null && durationSec > maxSeconds) return 'Over 25 min. Use whisper-1';
  return null;
}
