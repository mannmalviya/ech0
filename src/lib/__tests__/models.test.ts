import { describe, expect, it } from '@jest/globals';

import { estimateCost, formatUsd, modelProblem, MAX_UPLOAD_BYTES } from '../models';

describe('estimateCost', () => {
  it('multiplies minutes by the price per minute', () => {
    expect(estimateCost(600, ['gpt-transcribe'])).toBeCloseTo(0.045);
  });

  it('adds up all selected models', () => {
    expect(estimateCost(12 * 60, ['gpt-transcribe', 'whisper-1'])).toBeCloseTo(12 * 0.0045 + 12 * 0.006);
  });

  it('is 0 with no models', () => {
    expect(estimateCost(600, [])).toBe(0);
  });
});

describe('formatUsd', () => {
  it('uses 2 digits for normal amounts', () => {
    expect(formatUsd(0.13)).toBe('$0.13');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('uses 4 digits below 1 cent, so it does not show $0.00', () => {
    expect(formatUsd(0.0045)).toBe('$0.0045');
  });
});

describe('modelProblem', () => {
  it('allows short, small audio', () => {
    expect(modelProblem('gpt-transcribe', 1500, 1000)).toBeNull();
  });

  it('blocks gpt models over 25 minutes, but not whisper-1', () => {
    expect(modelProblem('gpt-4o-transcribe', 1501, 1000)).toMatch(/25 min/);
    expect(modelProblem('whisper-1', 3 * 3600, 1000)).toBeNull();
  });

  it('blocks all models over 25 MB', () => {
    expect(modelProblem('whisper-1', 60, MAX_UPLOAD_BYTES + 1)).toMatch(/25 MB/);
  });
});
