// Names for recordings and their files.

import type { ModelId } from './models';

const pad = (n: number) => String(n).padStart(2, '0');

/** For example "2026-10-08 14-32". Files cannot contain ":", so the time uses "-". */
export function defaultName(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}`
  );
}

/** Removes characters that file names cannot contain, and extra spaces. */
export function cleanName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
}

/** Adds " (2)", " (3)", ... if the name is taken. iOS file names ignore case, so this does too. */
export function uniqueName(base: string, taken: string[]): string {
  const lower = new Set(taken.map((t) => t.toLowerCase()));
  if (!lower.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
}

export function transcriptFileName(recordingName: string, model: ModelId): string {
  return `${recordingName} – ${model}.txt`;
}
