import { describe, expect, it } from '@jest/globals';

import { cleanName, defaultName, transcriptFileName, uniqueName } from '../names';

describe('defaultName', () => {
  it('formats date and time without ":"', () => {
    expect(defaultName(new Date(2026, 9, 8, 14, 5))).toBe('2026-10-08 14-05');
  });
});

describe('cleanName', () => {
  it('replaces characters that files cannot contain', () => {
    expect(cleanName('Q&A: AI/ML?')).toBe('Q&A- AI-ML-');
  });

  it('removes extra spaces and leading dots', () => {
    expect(cleanName('  ..Keynote   day 1 ')).toBe('Keynote day 1');
  });
});

describe('uniqueName', () => {
  it('keeps a free name', () => {
    expect(uniqueName('Keynote', ['Panel'])).toBe('Keynote');
  });

  it('adds a number to a taken name, ignoring case', () => {
    expect(uniqueName('Keynote', ['keynote', 'Keynote (2)'])).toBe('Keynote (3)');
  });
});

describe('transcriptFileName', () => {
  it('joins recording name and model', () => {
    expect(transcriptFileName('Keynote', 'whisper-1')).toBe('Keynote – whisper-1.txt');
  });
});
