import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, load, save } from '../src/persist';
import type { LibraryText, Session } from '../src/types';

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

const text: LibraryText = { id: 't1', title: 'Hello', content: 'Hello world', position: 1, addedAt: 5 };
const session: Session = { date: 1, words: 100, minutes: 1, wpm: 100 };

describe('persist', () => {
  it('load on empty storage returns defaults', () => {
    const data = load(memStorage());
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.library).toEqual([]);
    expect(data.sessions).toEqual([]);
  });

  it('round-trips library, settings, sessions', () => {
    const s = memStorage();
    save({ settings: { ...DEFAULT_SETTINGS, wpm: 400 }, library: [text], sessions: [session] }, s);
    const data = load(s);
    expect(data.settings.wpm).toBe(400);
    expect(data.library).toEqual([text]);
    expect(data.sessions).toEqual([session]);
  });

  it('falls back to defaults on corrupted JSON', () => {
    const s = memStorage();
    s.setItem('srt:settings', '{not json');
    s.setItem('srt:library', '[broken');
    const data = load(s);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.library).toEqual([]);
  });

  it('save returns false when storage throws (quota)', () => {
    const s = memStorage();
    s.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(save({ settings: DEFAULT_SETTINGS, library: [], sessions: [] }, s)).toBe(false);
  });
});
