// Turns the ech0://record link into "open the Record tab and start recording".
// A Shortcut with this link can run from the Action Button or Back Tap.

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const route = path
    .replace(/^ech0:\/\//, '')
    .replace(/^\/+/, '')
    .split('?')[0]
    .replace(/\/+$/, '');
  // The time makes each link new, so the Record screen starts again after an earlier shortcut.
  if (route === 'record') return `/?autostart=${Date.now()}`;
  return path;
}
