// The app's shared state: recordings, settings, and running transcriptions.
// Screens get it with useLibrary(). Every change is saved to the phone at once.

import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { splitAudio } from '../../modules/audio-splitter';
import { readDuration } from './audio';
import { estimateCost, needsParts, partLengths, PART_SECONDS, type ModelId } from './models';
import { askForName } from './name-prompt';
import { cleanName, defaultName, transcriptFileName, uniqueName } from './names';
import { transcribeFile } from './openai';
import {
  audioFile,
  ensureFolders,
  getApiKey,
  listParts,
  listUnsaved,
  loadLibrary,
  loadSettings,
  moveToUnsaved,
  partsFolder,
  saveLibrary,
  saveSettings,
  takenNames,
  transcriptFile,
  type Recording,
  type Settings,
} from './storage';
import { formatTime, mergeParts, toTxt, type Language, type PartState, type Transcript } from './transcript';

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
  /** Runs a failed transcript again. For long audio, only the failed parts are sent. */
  retry: (id: string, model: ModelId) => void;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

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
        const parts = t.parts?.map((p): PartState => (p.status === 'running' ? { status: 'failed' } : p));
        transcripts[t.model] = { ...t, parts, status: 'failed', error: 'Stopped before it finished. Tap Retry.' };
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
    const parts = partsFolder(id);
    if (parts.exists) parts.delete();
    setRecordings((list) => list.filter((x) => x.id !== id));
  }, []);

  // Several models can ask for the parts at the same time; they share one cutting job.
  const cutting = useRef(new Map<string, Promise<string[]>>());

  /** The audio to send: the whole file, or its 20-minute parts for long audio. */
  const audioParts = useCallback((r: Recording): Promise<string[]> => {
    if (!needsParts(r.durationSec, r.sizeBytes)) return Promise.resolve([audioFile(r).uri]);
    const existing = listParts(r.id);
    if (existing.length === partLengths(r.durationSec, r.sizeBytes).length) return Promise.resolve(existing);
    let job = cutting.current.get(r.id);
    if (!job) {
      job = splitAudio(audioFile(r).uri, partsFolder(r.id).uri, PART_SECONDS);
      job.finally(() => cutting.current.delete(r.id)).catch(() => {});
      cutting.current.set(r.id, job);
    }
    return job;
  }, []);

  /** Transcribes one recording with one model. `earlier` keeps finished parts from a failed run. */
  const runModel = useCallback(
    async (r: Recording, model: ModelId, language: Language, earlier?: PartState[]) => {
      const createdAt = new Date().toISOString();
      const put = (fields: Pick<Transcript, 'status'> & Partial<Transcript>) =>
        updateRecording(r.id, (x) => ({
          ...x,
          transcripts: { ...x.transcripts, [model]: { model, language, createdAt, text: '', ...fields } },
        }));
      let parts: PartState[] = earlier ?? [];
      put({ status: 'running', parts });

      try {
        const apiKey = await getApiKey();
        if (!apiKey) throw new Error('No API key. Add it in Settings.');
        const uris = await audioParts(r);
        const lengths = uris.length === 1 ? [r.durationSec] : partLengths(r.durationSec, r.sizeBytes);
        const keep = earlier?.length === uris.length;
        parts = uris.map((_, i) => (keep && earlier![i].status === 'done' ? earlier![i] : { status: 'running' }));
        put({ status: 'running', parts });

        // Parts go one after another; the selected models run at the same time.
        for (let i = 0; i < uris.length; i++) {
          if (parts[i].status === 'done') continue;
          try {
            const result = await transcribeFile(uris[i], model, language, apiKey);
            parts = parts.map((p, j) => (j === i ? { status: 'done', result } : p));
            const cost = estimateCost(lengths[i] ?? 0, [model]);
            setSettings((s) => ({ ...s, totalSpentUsd: s.totalSpentUsd + cost }));
          } catch (e) {
            parts = parts.map((p, j) => (j === i ? { status: 'failed', error: errorText(e) } : p));
          }
          put({ status: 'running', parts });
        }

        const failed = parts.filter((p) => p.status !== 'done');
        if (failed.length > 0) {
          throw new Error(
            uris.length === 1 ? failed[0].error : `${failed.length} of ${uris.length} parts failed: ${failed[0].error}`
          );
        }
        const done: Transcript = {
          ...mergeParts(parts.map((p) => p.result!), PART_SECONDS),
          model,
          language,
          createdAt,
          status: 'done',
        };
        // Use the newest name: the recording may have been renamed or deleted during the upload.
        const current = latest.current.find((x) => x.id === r.id);
        if (!current) return;
        const txt = transcriptFile(current.name, model);
        if (!txt.exists) txt.create();
        txt.write(toTxt(current.name, done));
        put(done);
      } catch (e) {
        put({ status: 'failed', error: errorText(e), parts });
      }
    },
    [updateRecording, audioParts]
  );

  const transcribe = useCallback(
    (id: string, models: ModelId[], language: Language) => {
      const r = latest.current.find((x) => x.id === id);
      if (r) for (const model of models) runModel(r, model, language);
    },
    [runModel]
  );

  const retry = useCallback(
    (id: string, model: ModelId) => {
      const r = latest.current.find((x) => x.id === id);
      const t = r?.transcripts[model];
      if (r && t) runModel(r, model, t.language, t.parts);
    },
    [runModel]
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  return (
    <LibraryContext.Provider
      value={{ recordings, settings, updateSettings, addRecording, importAudio, rename, remove, transcribe, retry }}>
      {children}
    </LibraryContext.Provider>
  );
}
