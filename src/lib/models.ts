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

/** Why a model cannot transcribe this audio, or null if it can. */
export function modelProblem(id: ModelId, durationSec: number, sizeBytes: number): string | null {
  if (sizeBytes > MAX_UPLOAD_BYTES) return 'File is larger than 25 MB';
  const { maxSeconds } = getModel(id);
  if (maxSeconds !== null && durationSec > maxSeconds) return 'Longer than 25 min. Use whisper-1';
  return null;
}
