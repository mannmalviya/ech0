import { File } from 'expo-file-system';

import type { ModelId } from './models';
import { formFields, parseResponse } from './openai-format';
import type { Language, TranscriptResult } from './transcript';

export async function transcribeFile(
  uri: string,
  model: ModelId,
  language: Language,
  apiKey: string
): Promise<TranscriptResult> {
  const form = new FormData();
  // Expo's fetch needs a real File object here; the { uri, name, type } form does not work.
  form.append('file', new File(uri));
  for (const [key, value] of formFields(model, language)) form.append(key, value);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return parseResponse(model, json);
}
