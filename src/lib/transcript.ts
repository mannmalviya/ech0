// Transcript data, the .txt export, and the highlight math.

import type { ModelId } from './models';

export type Language = 'auto' | 'en' | 'hi';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
];

export type Word = { word: string; start: number; end: number };

/** A part of the text with times. `speaker` is set only by the diarize model. */
export type Turn = { start: number; end: number; text: string; speaker?: string };

export type TranscriptResult = { text: string; words?: Word[]; turns?: Turn[] };

/** One part of long audio. Finished parts are kept, so Retry sends only the failed ones. */
export type PartState = { status: 'running' | 'done' | 'failed'; result?: TranscriptResult; error?: string };

export type Transcript = TranscriptResult & {
  model: ModelId;
  language: Language;
  createdAt: string;
  status: 'running' | 'done' | 'failed';
  error?: string;
  /** Only while running or after a failure, for audio cut into parts. */
  parts?: PartState[];
};

/**
 * Joins the results of the parts of long audio into one result. Times move by the part's start.
 * The diarize model labels speakers again in each part, so "A" in part 1 and part 2 can be different
 * people. To show this, speakers get the part number, for example "A (part 2)".
 */
export function mergeParts(results: TranscriptResult[], partSeconds: number): TranscriptResult {
  if (results.length === 1) return results[0];
  const merged: TranscriptResult = { text: results.map((r) => r.text.trim()).join('\n\n') };
  if (results.some((r) => r.words)) {
    merged.words = results.flatMap((r, i) =>
      (r.words ?? []).map((w) => ({ ...w, start: w.start + i * partSeconds, end: w.end + i * partSeconds }))
    );
  }
  if (results.some((r) => r.turns)) {
    merged.turns = results.flatMap((r, i) =>
      (r.turns ?? []).map((t) => ({
        ...t,
        start: t.start + i * partSeconds,
        end: t.end + i * partSeconds,
        ...(t.speaker ? { speaker: `${t.speaker} (part ${i + 1})` } : {}),
      }))
    );
  }
  return merged;
}

/** "4:05", or "1:02:09" for an hour or more. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** The text that Copy and Share give. It includes speakers and times when the model gives them. */
export function toTxt(recordingName: string, t: TranscriptResult & { model: ModelId }): string {
  let body = t.text;
  if (t.turns?.some((turn) => turn.speaker)) {
    body = t.turns
      .map((turn) => `${turn.speaker} [${formatTime(turn.start)}–${formatTime(turn.end)}]: ${turn.text.trim()}`)
      .join('\n');
  } else if (t.turns?.length) {
    body = t.turns.map((turn) => `[${formatTime(turn.start)}] ${turn.text.trim()}`).join('\n');
  }
  return `${recordingName} – ${t.model}\n\n${body.trim()}\n`;
}

/**
 * The index of the item that is playing at `time`: the last item that starts at or before it.
 * Returns -1 before the first item. Items must be sorted by start time.
 */
export function activeIndex(items: { start: number }[], time: number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
