/** Platform-aware modifier key label: ⌘ on macOS, Ctrl elsewhere. */
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export const MOD = isMac ? '⌘' : 'Ctrl';
export const PASTE_KEYS = `${MOD}+V`;
export const OPEN_KEYS = `${MOD}+O`;
