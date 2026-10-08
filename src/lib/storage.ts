// Where ech0 keeps its data on the phone.
//
// Documents/                       (shown in the Files app as "On My iPhone › ech0" in your own build)
//   Keynote.m4a                    a recording
//   Keynote – whisper-1.txt        one transcript per model
//   .ech0/library.json             names, lengths, and transcripts with their times
//   .ech0/settings.json            last models, language, and total spent
//   .ech0/unsaved/<time>.m4a       recordings that do not have a name yet

import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { ModelId } from './models';
import { transcriptFileName } from './names';
import type { Language, Transcript } from './transcript';

export type Recording = {
  id: string;
  name: string;
  /** File extension with the dot, for example ".m4a". */
  ext: string;
  createdAt: string;
  durationSec: number;
  sizeBytes: number;
  source: 'recorded' | 'imported';
  transcripts: Partial<Record<ModelId, Transcript>>;
};

export type Settings = {
  /** The models selected last time. */
  models: ModelId[];
  language: Language;
  /** ech0's own estimate of all money spent on transcription. */
  totalSpentUsd: number;
};

export const DEFAULT_SETTINGS: Settings = { models: ['gpt-transcribe'], language: 'auto', totalSpentUsd: 0 };

const appDir = new Directory(Paths.document, '.ech0');
const unsavedDir = new Directory(appDir, 'unsaved');
const libraryFile = new File(appDir, 'library.json');
const settingsFile = new File(appDir, 'settings.json');
const API_KEY = 'openai-api-key';

export function ensureFolders() {
  if (!unsavedDir.exists) unsavedDir.create({ intermediates: true });
}

function readJson<T>(file: File, fallback: T): T {
  try {
    return file.exists ? JSON.parse(file.textSync()) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file: File, value: unknown) {
  if (!file.exists) file.create();
  file.write(JSON.stringify(value, null, 2));
}

export const loadLibrary = () => readJson<Recording[]>(libraryFile, []);
export const saveLibrary = (recordings: Recording[]) => writeJson(libraryFile, recordings);
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(settingsFile, {}) });
export const saveSettings = (settings: Settings) => writeJson(settingsFile, settings);

export const audioFile = (r: Pick<Recording, 'name' | 'ext'>) => new File(Paths.document, r.name + r.ext);
export const transcriptFile = (recordingName: string, model: ModelId) =>
  new File(Paths.document, transcriptFileName(recordingName, model));

/** Names already used in the ech0 folder, without extensions. */
export function takenNames(): string[] {
  return new Directory(Paths.document)
    .list()
    .filter((item): item is File => item instanceof File)
    .map((f) => f.name.replace(/\.[^.]+$/, ''));
}

/** Moves a new recording out of the cache, so iOS cannot delete it before it has a name. */
export async function moveToUnsaved(uri: string, startedAt: Date): Promise<void> {
  const source = new File(uri);
  await source.move(new File(unsavedDir, `${startedAt.getTime()}${source.extension}`));
}

/** Recordings without a name, with the time they started (from their file name). */
export function listUnsaved(): { file: File; startedAt: Date }[] {
  return unsavedDir
    .list()
    .filter((item): item is File => item instanceof File)
    .map((file) => ({ file, startedAt: new Date(Number(file.name.replace(/\.[^.]+$/, '')) || Date.now()) }));
}

export const getApiKey = () => SecureStore.getItemAsync(API_KEY);
export const setApiKey = (key: string) => SecureStore.setItemAsync(API_KEY, key);
export const deleteApiKey = () => SecureStore.deleteItemAsync(API_KEY);
