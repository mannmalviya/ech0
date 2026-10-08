// The app's shared state: recordings, settings, and running transcriptions.
// Screens get it with useLibrary(). Every change is saved to the phone at once.

import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readDuration } from './audio';
import { estimateCost, type ModelId } from './models';
import { askForName } from './name-prompt';
import { cleanName, defaultName, transcriptFileName, uniqueName } from './names';
import { transcribeFile } from './openai';
import {
  audioFile,
  ensureFolders,
  getApiKey,
  listUnsaved,
  loadLibrary,
  loadSettings,
  moveToUnsaved,
  saveLibrary,
  saveSettings,
  takenNames,
  transcriptFile,
  type Recording,
  type Settings,
} from './storage';
import { formatTime, toTxt, type Language, type Transcript } from './transcript';

type LibraryValue = {
  recordings: Recording[];
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Called after Stop: keeps the file safe, then opens the name box. */
  addRecording: (uri: string, startedAt: Date) => Promise<void>;
  /** Opens the Files picker. Returns the new recording's id, or null if canceled. */
  importAudio: () => Promise<string | null>;
  rename: (id: string, newName: string) => void;
  remove: (id: string) => void;
  transcribe: (id: string, models: ModelId[], language: Language) => void;
};

const LibraryContext = createContext<LibraryValue | null>(null);

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}

const KEEP_AWAKE_TAG = 'ech0-transcribe';

function loadRecordings(): Recording[] {
  ensureFolders();
  // A transcription that was running when the app closed did not finish.
  return loadLibrary().map((r) => {
    const transcripts = { ...r.transcripts };
    for (const t of Object.values(transcripts)) {
      if (t.status === 'running') {
        transcripts[t.model] = { ...t, status: 'failed', error: 'Stopped before it finished. Tap Retry.' };
      }
    }
    return { ...r, transcripts };
  });
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [recordings, setRecordings] = useState<Recording[]>(loadRecordings);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const latest = useRef(recordings);
  const naming = useRef(false);

  useEffect(() => {
    latest.current = recordings;
    saveLibrary(recordings);
  }, [recordings]);

  useEffect(() => saveSettings(settings), [settings]);

  // Keep the screen on while any transcription runs, so iOS does not stop the upload.
  const running = recordings.some((r) => Object.values(r.transcripts).some((t) => t.status === 'running'));
  useEffect(() => {
    if (running) activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    else deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [running]);

  const updateRecording = useCallback((id: string, change: (r: Recording) => Recording) => {
    setRecordings((list) => list.map((r) => (r.id === id ? change(r) : r)));
  }, []);

  const addFile = useCallback(async (file: File, name: string, createdAt: Date, source: Recording['source']) => {
    const ext = file.extension || '.m4a';
    const target = new File(Paths.document, name + ext);
    await file.move(target);
    const durationSec = await readDuration(target.uri);
    const recording: Recording = {
      id: `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      ext,
      createdAt: createdAt.toISOString(),
      durationSec,
      sizeBytes: target.size,
      source,
      transcripts: {},
    };
    setRecordings((list) => [recording, ...list]);
    return recording.id;
  }, []);

  // Opens the name box for each recording that has no name yet, one at a time.
  const nameUnsaved = useCallback(async () => {
    if (naming.current) return;
    naming.current = true;
    try {
      for (let next = listUnsaved()[0]; next; next = listUnsaved()[0]) {
        const suggested = uniqueName(defaultName(next.startedAt), takenNames());
        const duration = await readDuration(next.file.uri);
        const choice = await askForName(suggested, formatTime(duration));
        if (choice.kind === 'delete') {
          next.file.delete();
          continue;
        }
        const name = uniqueName(cleanName(choice.name) || suggested, takenNames());
        await addFile(next.file, name, next.startedAt, 'recorded');
      }
    } finally {
      naming.current = false;
    }
  }, [addFile]);

  useEffect(() => {
    // allowsBackgroundRecording: keep recording when the screen locks (works in ech0's own build, not Expo Go).
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
    // Recordings left without a name the last time the app closed.
    nameUnsaved();
  }, [nameUnsaved]);

  const addRecording = useCallback(
    async (uri: string, startedAt: Date) => {
      await moveToUnsaved(uri, startedAt);
      await nameUnsaved();
    },
    [nameUnsaved]
  );

  const importAudio = useCallback(async () => {
    const picked = await File.pickFileAsync({ mimeTypes: 'audio/*' });
    if (picked.canceled) return null;
    const file = picked.result;
    const base = cleanName(file.name.replace(/\.[^.]+$/, '')) || defaultName(new Date());
    return addFile(file, uniqueName(base, takenNames()), new Date(), 'imported');
  }, [addFile]);

  const rename = useCallback(
    (id: string, newName: string) => {
      const r = latest.current.find((x) => x.id === id);
      if (!r) return;
      const others = takenNames().filter((n) => n.toLowerCase() !== r.name.toLowerCase());
      const name = uniqueName(cleanName(newName) || r.name, others);
      if (name === r.name) return;
      audioFile(r).rename(name + r.ext);
      for (const model of Object.keys(r.transcripts) as ModelId[]) {
        const txt = transcriptFile(r.name, model);
        if (txt.exists) txt.rename(transcriptFileName(name, model));
      }
      updateRecording(id, (x) => ({ ...x, name }));
    },
    [updateRecording]
  );

  const remove = useCallback((id: string) => {
    const r = latest.current.find((x) => x.id === id);
    if (!r) return;
    const files = [audioFile(r), ...Object.keys(r.transcripts).map((m) => transcriptFile(r.name, m as ModelId))];
    for (const f of files) if (f.exists) f.delete();
    setRecordings((list) => list.filter((x) => x.id !== id));
  }, []);

  const transcribe = useCallback(
    async (id: string, models: ModelId[], language: Language) => {
      const r = latest.current.find((x) => x.id === id);
      if (!r) return;
      const createdAt = new Date().toISOString();
      const setTranscript = (model: ModelId, t: Transcript) =>
        updateRecording(id, (x) => ({ ...x, transcripts: { ...x.transcripts, [model]: t } }));

      for (const model of models) {
        setTranscript(model, { model, language, createdAt, status: 'running', text: '' });
      }
      const apiKey = await getApiKey();

      // All selected models run at the same time.
      await Promise.all(
        models.map(async (model) => {
          try {
            if (!apiKey) throw new Error('No API key. Add it in Settings.');
            const result = await transcribeFile(audioFile(r).uri, model, language, apiKey);
            setSettings((s) => ({ ...s, totalSpentUsd: s.totalSpentUsd + estimateCost(r.durationSec, [model]) }));
            const done: Transcript = { ...result, model, language, createdAt, status: 'done' };
            // Use the newest name: the recording may have been renamed or deleted during the upload.
            const current = latest.current.find((x) => x.id === id);
            if (!current) return;
            const txt = transcriptFile(current.name, model);
            if (!txt.exists) txt.create();
            txt.write(toTxt(current.name, done));
            setTranscript(model, done);
          } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            setTranscript(model, { model, language, createdAt, status: 'failed', text: '', error });
          }
        })
      );
    },
    [updateRecording]
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  return (
    <LibraryContext.Provider
      value={{ recordings, settings, updateSettings, addRecording, importAudio, rename, remove, transcribe }}>
      {children}
    </LibraryContext.Provider>
  );
}
