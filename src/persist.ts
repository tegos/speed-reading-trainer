import type { LibraryText, Session, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  wpm: 250,
  chunkSize: 2,
  fontSize: 18,
  mode: 'book',
  autoProgress: false,
  activeTextId: null,
};

const KEYS = {
  version: 'srt:v',
  settings: 'srt:settings',
  library: 'srt:library',
  sessions: 'srt:sessions',
} as const;

const VERSION = '1';

export interface Persisted {
  settings: Settings;
  library: LibraryText[];
  sessions: Session[];
}

function read<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function load(storage: Storage = localStorage): Persisted {
  return {
    settings: { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(storage, KEYS.settings, {}) },
    library: read<LibraryText[]>(storage, KEYS.library, []),
    sessions: read<Session[]>(storage, KEYS.sessions, []),
  };
}

export function save(data: Persisted, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(KEYS.version, VERSION);
    storage.setItem(KEYS.settings, JSON.stringify(data.settings));
    storage.setItem(KEYS.library, JSON.stringify(data.library));
    storage.setItem(KEYS.sessions, JSON.stringify(data.sessions));
    return true;
  } catch {
    return false;
  }
}
