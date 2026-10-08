import { describe, expect, it } from '@jest/globals';

import { activeIndex, formatTime, mergeParts, toTxt } from '../transcript';

describe('formatTime', () => {
  it('shows minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(245.9)).toBe('4:05');
  });

  it('shows hours for long audio', () => {
    expect(formatTime(3729)).toBe('1:02:09');
  });
});

describe('toTxt', () => {
  it('gives plain text when the model gives no times', () => {
    expect(toTxt('Talk', { model: 'gpt-transcribe', text: 'Hello there.' })).toBe(
      'Talk – gpt-transcribe\n\nHello there.\n'
    );
  });

  it('gives speakers and times for diarize', () => {
    const txt = toTxt('Talk', {
      model: 'gpt-4o-transcribe-diarize',
      text: 'Hi. Yes.',
      turns: [
        { speaker: 'A', start: 0, end: 4.2, text: ' Hi.' },
        { speaker: 'B', start: 4.2, end: 6, text: 'Yes.' },
      ],
    });
    expect(txt).toBe('Talk – gpt-4o-transcribe-diarize\n\nA [0:00–0:04]: Hi.\nB [0:04–0:06]: Yes.\n');
  });

  it('gives times without speakers for whisper-1', () => {
    const txt = toTxt('Talk', {
      model: 'whisper-1',
      text: 'One. Two.',
      turns: [
        { start: 0, end: 1, text: 'One.' },
        { start: 61, end: 62, text: 'Two.' },
      ],
    });
    expect(txt).toBe('Talk – whisper-1\n\n[0:00] One.\n[1:01] Two.\n');
  });
});

describe('activeIndex', () => {
  const words = [{ start: 0.5 }, { start: 1 }, { start: 2 }];

  it('is -1 before the first item', () => {
    expect(activeIndex(words, 0.2)).toBe(-1);
  });

  it('finds the last item that started', () => {
    expect(activeIndex(words, 0.5)).toBe(0);
    expect(activeIndex(words, 1.5)).toBe(1);
    expect(activeIndex(words, 99)).toBe(2);
  });

  it('is -1 for an empty list', () => {
    expect(activeIndex([], 3)).toBe(-1);
  });
});

describe('mergeParts', () => {
  it('returns a single part as it is', () => {
    const one = { text: 'Hi.', words: [{ word: 'Hi', start: 1, end: 2 }] };
    expect(mergeParts([one], 1200)).toBe(one);
  });

  it('moves word times by each part start, and joins text', () => {
    const merged = mergeParts(
      [
        { text: 'One.', words: [{ word: 'One', start: 1, end: 2 }] },
        { text: ' Two.', words: [{ word: 'Two', start: 3, end: 4 }] },
      ],
      1200
    );
    expect(merged.text).toBe('One.\n\nTwo.');
    expect(merged.words).toEqual([
      { word: 'One', start: 1, end: 2 },
      { word: 'Two', start: 1203, end: 1204 },
    ]);
  });

  it('adds the part number to diarize speakers', () => {
    const merged = mergeParts(
      [
        { text: 'Hi.', turns: [{ speaker: 'A', start: 0, end: 1, text: 'Hi.' }] },
        { text: 'Yes.', turns: [{ speaker: 'A', start: 5, end: 6, text: 'Yes.' }] },
      ],
      1200
    );
    expect(merged.turns).toEqual([
      { speaker: 'A (part 1)', start: 0, end: 1, text: 'Hi.' },
      { speaker: 'A (part 2)', start: 1205, end: 1206, text: 'Yes.' },
    ]);
  });
});
