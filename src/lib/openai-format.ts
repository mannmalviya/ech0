// What ech0 sends to OpenAI for each model, and how it reads the answer.
// Docs: https://developers.openai.com/api/docs/guides/speech-to-text

import type { ModelId } from './models';
import type { Language, TranscriptResult } from './transcript';

/** Form fields for /v1/audio/transcriptions, except the file. */
export function formFields(model: ModelId, language: Language): [string, string][] {
  const fields: [string, string][] = [['model', model]];
  const lang = language === 'auto' ? null : language;

  switch (model) {
    case 'gpt-transcribe':
      // gpt-transcribe takes a list of languages instead of `language`.
      if (lang) fields.push(['languages[]', lang]);
      break;
    case 'gpt-4o-transcribe':
    case 'gpt-4o-mini-transcribe':
      if (lang) fields.push(['language', lang]);
      // Without this, the model can stop after the first pause and drop the rest.
      fields.push(['chunking_strategy', 'auto']);
      break;
    case 'gpt-4o-transcribe-diarize':
      // The diarize model does not accept `language`; it finds the language itself.
      fields.push(['response_format', 'diarized_json'], ['chunking_strategy', 'auto']);
      break;
    case 'whisper-1':
      if (lang) fields.push(['language', lang]);
      fields.push(
        ['response_format', 'verbose_json'],
        ['timestamp_granularities[]', 'word'],
        ['timestamp_granularities[]', 'segment']
      );
      break;
  }
  return fields;
}

type Segment = { start: number; end: number; text: string; speaker?: string };

export function parseResponse(model: ModelId, json: any): TranscriptResult {
  if (model === 'gpt-4o-transcribe-diarize') {
    const turns = (json.segments ?? []).map((s: Segment) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      speaker: s.speaker,
    }));
    return { text: json.text ?? turns.map((t: Segment) => t.text).join(' '), turns };
  }
  if (model === 'whisper-1') {
    return {
      text: json.text,
      words: json.words?.map((w: any) => ({ word: w.word, start: w.start, end: w.end })),
      turns: json.segments?.map((s: Segment) => ({ start: s.start, end: s.end, text: s.text })),
    };
  }
  return { text: json.text };
}
