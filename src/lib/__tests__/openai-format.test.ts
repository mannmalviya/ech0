import { describe, expect, it } from '@jest/globals';

import { formFields, parseResponse } from '../openai-format';

describe('formFields', () => {
  it('sends languages[] for gpt-transcribe', () => {
    expect(formFields('gpt-transcribe', 'hi')).toEqual([
      ['model', 'gpt-transcribe'],
      ['languages[]', 'hi'],
    ]);
  });

  it('sends no language for Auto', () => {
    expect(formFields('gpt-transcribe', 'auto')).toEqual([['model', 'gpt-transcribe']]);
    expect(formFields('gpt-4o-transcribe', 'auto')).toEqual([
      ['model', 'gpt-4o-transcribe'],
      ['chunking_strategy', 'auto'],
    ]);
  });

  it('never sends a language to diarize', () => {
    expect(formFields('gpt-4o-transcribe-diarize', 'en')).toEqual([
      ['model', 'gpt-4o-transcribe-diarize'],
      ['response_format', 'diarized_json'],
      ['chunking_strategy', 'auto'],
    ]);
  });

  it('asks whisper-1 for word and segment times', () => {
    expect(formFields('whisper-1', 'en')).toEqual([
      ['model', 'whisper-1'],
      ['language', 'en'],
      ['response_format', 'verbose_json'],
      ['timestamp_granularities[]', 'word'],
      ['timestamp_granularities[]', 'segment'],
    ]);
  });
});

describe('parseResponse', () => {
  it('reads plain text', () => {
    expect(parseResponse('gpt-transcribe', { text: 'Hi.' })).toEqual({ text: 'Hi.' });
  });

  it('reads diarize speaker turns', () => {
    const result = parseResponse('gpt-4o-transcribe-diarize', {
      text: 'Hi. Yes.',
      segments: [
        { type: 'transcript.text.segment', id: 'seg_0', speaker: 'A', start: 0, end: 1, text: 'Hi.' },
        { type: 'transcript.text.segment', id: 'seg_1', speaker: 'B', start: 1, end: 2, text: 'Yes.' },
      ],
    });
    expect(result).toEqual({
      text: 'Hi. Yes.',
      turns: [
        { speaker: 'A', start: 0, end: 1, text: 'Hi.' },
        { speaker: 'B', start: 1, end: 2, text: 'Yes.' },
      ],
    });
  });

  it('reads whisper-1 words and segments', () => {
    const result = parseResponse('whisper-1', {
      text: 'Hi there.',
      words: [
        { word: 'Hi', start: 0, end: 0.4 },
        { word: 'there', start: 0.4, end: 0.9 },
      ],
      segments: [{ id: 0, start: 0, end: 0.9, text: ' Hi there.', tokens: [1, 2] }],
    });
    expect(result).toEqual({
      text: 'Hi there.',
      words: [
        { word: 'Hi', start: 0, end: 0.4 },
        { word: 'there', start: 0.4, end: 0.9 },
      ],
      turns: [{ start: 0, end: 0.9, text: ' Hi there.' }],
    });
  });
});
