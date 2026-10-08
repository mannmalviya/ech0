import { describe, expect, it } from '@jest/globals';

import { redirectSystemPath } from '../../app/+native-intent';

const redirect = (path: string) => redirectSystemPath({ path, initial: true });

describe('redirectSystemPath', () => {
  it('turns the record link into the Record tab with autostart', () => {
    expect(redirect('ech0://record')).toMatch(/^\/\?autostart=\d+$/);
    expect(redirect('ech0:///record/')).toMatch(/^\/\?autostart=\d+$/);
    expect(redirect('/record')).toMatch(/^\/\?autostart=\d+$/);
  });

  it('leaves other links as they are', () => {
    expect(redirect('ech0://library')).toBe('ech0://library');
    expect(redirect('/settings')).toBe('/settings');
  });
});
