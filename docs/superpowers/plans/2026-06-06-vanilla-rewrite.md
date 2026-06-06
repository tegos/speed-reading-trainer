# Vanilla TS Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the speed reading trainer as a zero-dependency vanilla TypeScript app with two modes (book pacer + RSVP), localStorage persistence, stats, and the kami design language.

**Architecture:** Mini pub/sub store + pure-logic engine (fully unit-tested, no DOM) + render modules that `mount(el, store)` and subscribe. Composition and playback glue in `main.ts`. Spec: `docs/superpowers/specs/2026-06-06-vanilla-rewrite-design.md`.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 3 (+ jsdom for render tests). Zero runtime dependencies.

---

## File structure

```
index.html              — app shell (replaces React version)
src/
  types.ts              — shared interfaces (LibraryText, Settings, Session, State)
  store.ts              — createStore: get/set/subscribe
  engine.ts             — pure logic: words, chunks, delays, ORP, progression, sessions, player
  persist.ts            — localStorage load/save with versioning + corruption fallback
  modes/book.ts         — book mode render, click-to-rewind
  modes/rsvp.ts         — RSVP stage render
  panels/library.ts     — library overlay
  panels/stats.ts       — stats overlay (table + SVG chart)
  ui/toolbar.ts         — header + bottom bar + hotkeys
  ui/loader.ts          — text input: paste / Ctrl+O / drag&drop, toast errors
  main.ts               — composition, playback glue, session recording
  styles.css            — kami tokens, all component styles
test/
  store.test.ts
  engine.test.ts
  persist.test.ts
  book.test.ts          — jsdom render smoke
```

React-era files (`src/App.jsx`, `src/components/*`, `src/main.jsx`, `src/styles.css`, `vite.config.js`) are deleted in Task 1.

---

### Task 1: Scaffold — branch, deps, config, app shell

**Files:**
- Create: `tsconfig.json`, `vite.config.ts`, `src/main.ts`, `src/styles.css`, `src/types.ts`
- Modify: `package.json`, `index.html`
- Delete: `src/App.jsx`, `src/main.jsx`, `src/components/`, `vite.config.js`

- [ ] **Step 1: Create branch**

```bash
git checkout -b vanilla
```

- [ ] **Step 2: Replace package.json**

```json
{
  "name": "speed-reading-trainer",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "description": "Speed reading trainer: book pacer + RSVP, zero runtime dependencies",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.5",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 3: Remove React files, install**

```bash
git rm -r src/App.jsx src/main.jsx src/components vite.config.js
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 5: Write vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
} as never);
```

Note: the `test` key is read by Vitest; `as never` avoids pulling in vitest types at config level. Alternative accepted: `/// <reference types="vitest/config" />` + plain object.

- [ ] **Step 6: Write src/types.ts**

```ts
export interface LibraryText {
  id: string;
  title: string;
  content: string;
  position: number; // word index
  addedAt: number; // epoch ms
}

export type Mode = 'book' | 'rsvp';

export interface Settings {
  wpm: number;
  chunkSize: number; // 1–5 words
  fontSize: number; // px, 14–24
  mode: Mode;
  autoProgress: boolean;
  activeTextId: string | null;
}

export interface Session {
  date: number; // epoch ms, session start
  words: number;
  minutes: number;
  wpm: number; // effective
}

export interface State {
  settings: Settings;
  library: LibraryText[];
  sessions: Session[];
  words: string[]; // active text, split
  position: number; // current word index
  running: boolean;
  overlay: 'library' | 'stats' | null;
}
```

- [ ] **Step 7: Replace index.html body and write placeholder main.ts**

`index.html` (full file):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Speed reading trainer: book pacer and RSVP modes" />
    <title>Speed Reading Trainer</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```ts
import './styles.css';

document.querySelector<HTMLDivElement>('#app')!.textContent = 'scaffold ok';
```

`src/styles.css` — kami tokens only for now (components come later):

```css
:root {
  --parchment: #f5f4ed;
  --ivory: #faf9f5;
  --warm-sand: #e8e6dc;
  --deep-dark: #141413;
  --brand: #1b365d;
  --ink-light: #2d5a8a;
  --tag-bg: #e4ecf5;
  --text: #141413;
  --text-secondary: #5e5d59;
  --text-meta: #87867f;
  --text-faded: #b0aea5;
  --border: #e8e5da;
  --font-serif: 'Newsreader', Georgia, serif;
  --font-sans: Inter, system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--parchment);
  color: var(--text);
  font-family: var(--font-sans);
}
```

- [ ] **Step 8: Verify dev build and typecheck**

Run: `npm run build`
Expected: tsc passes, vite build succeeds.

Run: `npm test`
Expected: "No test files found" exit 0 (or pass `--passWithNoTests` if vitest errors; add that flag to the `test` script in that case).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold vanilla TS + Vite, drop React"
```

---

### Task 2: Store

**Files:**
- Create: `src/store.ts`
- Test: `test/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/store';

describe('createStore', () => {
  it('returns initial state', () => {
    const s = createStore({ a: 1 });
    expect(s.get()).toEqual({ a: 1 });
  });

  it('merges patches and notifies subscribers', () => {
    const s = createStore({ a: 1, b: 'x' });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 2 });
    expect(s.get()).toEqual({ a: 2, b: 'x' });
    expect(fn).toHaveBeenCalledWith({ a: 2, b: 'x' });
  });

  it('unsubscribe stops notifications', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.set({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store`
Expected: FAIL — cannot resolve `../src/store`.

- [ ] **Step 3: Write src/store.ts**

```ts
export type Listener<T> = (state: T) => void;

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(fn: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const fn of listeners) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- store`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts test/store.test.ts
git commit -m "feat: pub/sub store"
```

---

### Task 3: Engine — pure reading logic

**Files:**
- Create: `src/engine.ts`
- Test: `test/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  WPM_MAX,
  WPM_MIN,
  chunkEnd,
  createPlayer,
  finishSession,
  minutesLeft,
  orpIndex,
  progressWpm,
  rsvpDelayMs,
  splitWords,
  tickMs,
} from '../src/engine';

describe('splitWords', () => {
  it('splits on any whitespace, drops empties', () => {
    expect(splitWords('  one\n two\tthree ')).toEqual(['one', 'two', 'three']);
  });
});

describe('chunkEnd', () => {
  it('advances by chunk size', () => {
    expect(chunkEnd(0, 3, 100)).toBe(3);
  });
  it('clamps to total', () => {
    expect(chunkEnd(98, 5, 100)).toBe(100);
  });
});

describe('tickMs', () => {
  it('is 60000/wpm per word times chunk size', () => {
    expect(tickMs(300, 1)).toBe(200);
    expect(tickMs(300, 3)).toBe(600);
  });
});

describe('rsvpDelayMs', () => {
  it('base delay for plain short word', () => {
    expect(rsvpDelayMs('cat', 300)).toBe(200);
  });
  it('x2 after sentence punctuation', () => {
    expect(rsvpDelayMs('end.', 300)).toBe(400);
    expect(rsvpDelayMs('really?', 300)).toBe(400);
  });
  it('x1.3 after comma', () => {
    expect(rsvpDelayMs('pause,', 300)).toBeCloseTo(260);
  });
  it('x1.5 for words with 8+ letters', () => {
    expect(rsvpDelayMs('typography', 300)).toBe(300);
  });
  it('long word + sentence end takes the larger multiplier', () => {
    expect(rsvpDelayMs('typography.', 300)).toBe(400);
  });
});

describe('orpIndex', () => {
  it('is ~35% into the word', () => {
    expect(orpIndex('a')).toBe(0);
    expect(orpIndex('word')).toBe(1); // (4-1)*0.35 = 1.05 -> 1
    expect(orpIndex('typography')).toBe(3); // 9*0.35 = 3.15 -> 3
  });
});

describe('progressWpm', () => {
  it('+10 per full 2 minutes', () => {
    expect(progressWpm(250, 4 * 60_000)).toBe(270);
  });
  it('no bump before 2 minutes', () => {
    expect(progressWpm(250, 119_000)).toBe(250);
  });
  it('caps at WPM_MAX', () => {
    expect(progressWpm(WPM_MAX - 5, 10 * 60_000)).toBe(WPM_MAX);
  });
});

describe('minutesLeft', () => {
  it('remaining words / wpm, rounded up', () => {
    expect(minutesLeft(1000, 400, 300)).toBe(2); // 600 words @300wpm
  });
});

describe('finishSession', () => {
  it('returns null for sessions under 10s', () => {
    expect(finishSession({ startedAt: 0, startPosition: 0 }, 9_000, 50)).toBeNull();
  });
  it('computes words, minutes, effective wpm', () => {
    const s = finishSession({ startedAt: 0, startPosition: 100 }, 60_000, 400);
    expect(s).toEqual({ date: 0, words: 300, minutes: 1, wpm: 300 });
  });
});

describe('createPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks repeatedly using getDelay', () => {
    const onTick = vi.fn();
    const p = createPlayer({ getDelay: () => 100, onTick });
    p.start();
    vi.advanceTimersByTime(350);
    expect(onTick).toHaveBeenCalledTimes(3);
    p.stop();
    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- engine`
Expected: FAIL — cannot resolve `../src/engine`.

- [ ] **Step 3: Write src/engine.ts**

```ts
import type { Session } from './types';

export const WPM_MIN = 60;
export const WPM_MAX = 600;
export const PROGRESS_STEP = 10; // wpm added per interval
export const PROGRESS_INTERVAL_MS = 2 * 60_000;
export const MIN_SESSION_MS = 10_000;

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** End index (exclusive) of the chunk starting at `position`. */
export function chunkEnd(position: number, chunkSize: number, total: number): number {
  return Math.min(position + chunkSize, total);
}

/** Book mode: ms per chunk. */
export function tickMs(wpm: number, chunkSize: number): number {
  return (60_000 / wpm) * chunkSize;
}

/** RSVP: ms for one word, with punctuation / long-word slowdowns (spec). */
export function rsvpDelayMs(word: string, wpm: number): number {
  const base = 60_000 / wpm;
  let mult = 1;
  if (/[.!?;:]["')\]]?$/.test(word)) mult = 2;
  else if (/,["')\]]?$/.test(word)) mult = 1.3;
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  if (letters >= 8) mult = Math.max(mult, 1.5);
  return base * mult;
}

/** Optimal recognition point: ~35% into the word. */
export function orpIndex(word: string): number {
  return Math.round((word.length - 1) * 0.35);
}

/** Auto-progression: +PROGRESS_STEP per full PROGRESS_INTERVAL_MS, capped. */
export function progressWpm(startWpm: number, elapsedMs: number): number {
  const bumps = Math.floor(elapsedMs / PROGRESS_INTERVAL_MS);
  return Math.min(startWpm + bumps * PROGRESS_STEP, WPM_MAX);
}

export function minutesLeft(totalWords: number, position: number, wpm: number): number {
  return Math.ceil((totalWords - position) / wpm);
}

export interface SessionTracker {
  startedAt: number; // epoch ms
  startPosition: number;
}

export function finishSession(
  tracker: SessionTracker,
  now: number,
  position: number,
): Session | null {
  const ms = now - tracker.startedAt;
  if (ms < MIN_SESSION_MS) return null;
  const words = position - tracker.startPosition;
  const minutes = ms / 60_000;
  return {
    date: tracker.startedAt,
    words,
    minutes: Math.round(minutes * 100) / 100,
    wpm: Math.round(words / minutes),
  };
}

export interface Player {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/** setTimeout loop with a dynamic delay; getDelay is re-read every tick. */
export function createPlayer(opts: { getDelay(): number; onTick(): void }): Player {
  let id: ReturnType<typeof setTimeout> | null = null;
  const loop = () => {
    id = setTimeout(() => {
      opts.onTick();
      if (id !== null) loop();
    }, opts.getDelay());
  };
  return {
    start() {
      if (id === null) loop();
    },
    stop() {
      if (id !== null) {
        clearTimeout(id);
        id = null;
      }
    },
    get running() {
      return id !== null;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- engine`
Expected: all pass. If `rsvpDelayMs('really?', 300)` fails, the regex must treat `?` inside the char class (it does: `[.!?;:]`).

- [ ] **Step 5: Commit**

```bash
git add src/engine.ts test/engine.test.ts
git commit -m "feat: reading engine (chunks, RSVP delays, ORP, progression, sessions, player)"
```

---

### Task 4: Persistence

**Files:**
- Create: `src/persist.ts`
- Test: `test/persist.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- persist`
Expected: FAIL — cannot resolve `../src/persist`.

- [ ] **Step 3: Write src/persist.ts**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- persist`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/persist.ts test/persist.test.ts
git commit -m "feat: localStorage persistence with corruption fallback"
```

---

### Task 5: Book mode render

**Files:**
- Create: `src/modes/book.ts`
- Test: `test/book.test.ts`
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createStore } from '../src/store';
import { mountBook } from '../src/modes/book';
import type { State } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/persist';

function makeState(over: Partial<State> = {}): State {
  return {
    settings: { ...DEFAULT_SETTINGS, chunkSize: 2 },
    library: [],
    sessions: [],
    words: ['one', 'two', 'three', 'four'],
    position: 2,
    running: false,
    overlay: null,
    ...over,
  };
}

describe('mountBook', () => {
  it('renders a span per word with read/active classes', () => {
    const store = createStore(makeState());
    const el = document.createElement('div');
    mountBook(el, store);
    const spans = el.querySelectorAll('span.word');
    expect(spans).toHaveLength(4);
    expect(spans[0].classList.contains('read')).toBe(true);
    expect(spans[1].classList.contains('read')).toBe(true);
    expect(spans[2].classList.contains('active')).toBe(true);
    expect(spans[3].classList.contains('active')).toBe(true); // chunkSize 2
  });

  it('click on a word rewinds position', () => {
    const store = createStore(makeState());
    const el = document.createElement('div');
    mountBook(el, store);
    (el.querySelectorAll('span.word')[0] as HTMLElement).click();
    expect(store.get().position).toBe(0);
  });

  it('re-renders word list when text changes', () => {
    const store = createStore(makeState());
    const el = document.createElement('div');
    mountBook(el, store);
    store.set({ words: ['a', 'b'], position: 0 });
    expect(el.querySelectorAll('span.word')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- book`
Expected: FAIL — cannot resolve `../src/modes/book`.

- [ ] **Step 3: Write src/modes/book.ts**

```ts
import { chunkEnd, minutesLeft } from '../engine';
import type { Store } from '../store';
import type { State } from '../types';

/** Book mode: word spans, chunk highlight, click-to-rewind, progress bar. */
export function mountBook(el: HTMLElement, store: Store<State>): void {
  el.innerHTML = `
    <div class="book">
      <div class="book-text"></div>
      <div class="book-progress">
        <div class="book-progress-track"><div class="book-progress-fill"></div></div>
        <div class="book-progress-meta">
          <span class="book-progress-pct"></span>
          <span class="book-progress-eta"></span>
        </div>
      </div>
    </div>`;
  const textEl = el.querySelector<HTMLElement>('.book-text')!;
  const fillEl = el.querySelector<HTMLElement>('.book-progress-fill')!;
  const pctEl = el.querySelector<HTMLElement>('.book-progress-pct')!;
  const etaEl = el.querySelector<HTMLElement>('.book-progress-eta')!;

  let renderedWords: string[] = [];

  function rebuild(words: string[]): void {
    textEl.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.addEventListener('click', () => store.set({ position: i }));
      textEl.append(span, document.createTextNode(' '));
    });
    renderedWords = words;
  }

  function render(state: State): void {
    if (state.words !== renderedWords) rebuild(state.words);
    textEl.style.fontSize = `${state.settings.fontSize}px`;
    const end = chunkEnd(state.position, state.settings.chunkSize, state.words.length);
    const spans = textEl.querySelectorAll<HTMLElement>('span.word');
    spans.forEach((span, i) => {
      span.classList.toggle('read', i < state.position);
      span.classList.toggle('active', i >= state.position && i < end);
    });
    const pct = state.words.length ? Math.round((state.position / state.words.length) * 100) : 0;
    fillEl.style.width = `${pct}%`;
    pctEl.textContent = `${pct}%`;
    etaEl.textContent = `~${minutesLeft(state.words.length, state.position, state.settings.wpm)} min left`;
  }

  render(store.get());
  store.subscribe(render);
}
```

- [ ] **Step 4: Append book styles to src/styles.css**

```css
/* Book mode */

.book {
  max-width: 68ch;
  margin: 0 auto;
  padding: 32px 16px 16px;
}

.book-text {
  font-family: var(--font-serif);
  line-height: 1.85;
  user-select: none;
}

.book-text .word {
  border-radius: 3px;
  padding: 0 1px;
  cursor: pointer;
}

.book-text .word.read {
  color: var(--text-faded);
}

.book-text .word.active {
  background: var(--tag-bg);
  color: var(--brand);
}

.book-progress {
  margin-top: 24px;
}

.book-progress-track {
  height: 3px;
  background: var(--warm-sand);
  border-radius: 2px;
}

.book-progress-fill {
  height: 100%;
  background: var(--brand);
  border-radius: 2px;
  transition: width 0.2s;
}

.book-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-meta);
  margin-top: 6px;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- book`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/modes/book.ts test/book.test.ts src/styles.css
git commit -m "feat: book mode with chunk pacer and click-to-rewind"
```

---

### Task 6: RSVP mode render

**Files:**
- Create: `src/modes/rsvp.ts`
- Modify: `src/styles.css` (append)

No unit test (pure DOM presentation; ORP math already tested in engine). Manual smoke in Task 10.

- [ ] **Step 1: Write src/modes/rsvp.ts**

```ts
import { orpIndex } from '../engine';
import type { Store } from '../store';
import type { State } from '../types';

/** RSVP stage: dark scene, centered word with ORP letter accent. */
export function mountRsvp(el: HTMLElement, store: Store<State>): void {
  el.innerHTML = `
    <div class="rsvp">
      <div class="rsvp-meta"></div>
      <div class="rsvp-guide"></div>
      <div class="rsvp-word"></div>
      <div class="rsvp-guide"></div>
      <div class="rsvp-hint">space — pause · ← → — speed</div>
    </div>`;
  const wordEl = el.querySelector<HTMLElement>('.rsvp-word')!;
  const metaEl = el.querySelector<HTMLElement>('.rsvp-meta')!;

  function render(state: State): void {
    const word = state.words[state.position] ?? '';
    const orp = orpIndex(word);
    wordEl.innerHTML = '';
    wordEl.append(
      document.createTextNode(word.slice(0, orp)),
      Object.assign(document.createElement('span'), { className: 'orp', textContent: word[orp] ?? '' }),
      document.createTextNode(word.slice(orp + 1)),
    );
    wordEl.style.fontSize = `${state.settings.fontSize * 2}px`;
    metaEl.textContent = `${state.settings.wpm} wpm · word ${Math.min(state.position + 1, state.words.length)} of ${state.words.length}`;
  }

  render(store.get());
  store.subscribe(render);
}
```

- [ ] **Step 2: Append RSVP styles to src/styles.css**

```css
/* RSVP mode */

.rsvp {
  background: var(--deep-dark);
  border-radius: 12px;
  max-width: 720px;
  margin: 32px auto;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.rsvp-meta,
.rsvp-hint {
  font-size: 11px;
  color: var(--text-meta);
}

.rsvp-meta {
  margin-bottom: 16px;
}

.rsvp-hint {
  margin-top: 16px;
  color: var(--text-secondary);
}

.rsvp-guide {
  width: 1px;
  height: 12px;
  background: #4d4c48;
}

.rsvp-word {
  font-family: var(--font-serif);
  color: var(--ivory);
  min-height: 1.4em;
}

.rsvp-word .orp {
  color: var(--ink-light);
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modes/rsvp.ts src/styles.css
git commit -m "feat: RSVP stage with ORP accent"
```

---

### Task 7: Toolbar, header, hotkeys

**Files:**
- Create: `src/ui/toolbar.ts`
- Modify: `src/styles.css` (append)

`onTogglePlay` is injected by `main.ts` (playback glue owns session logic).

- [ ] **Step 1: Write src/ui/toolbar.ts**

```ts
import { WPM_MAX, WPM_MIN } from '../engine';
import type { Store } from '../store';
import type { Mode, State } from '../types';

export interface ToolbarHooks {
  onTogglePlay(): void;
  onOpenFile(): void;
  onReset(): void;
}

export function mountHeader(el: HTMLElement, store: Store<State>): void {
  el.innerHTML = `
    <header class="header">
      <h1>Speed Reading Trainer</h1>
      <div class="header-mode">
        <button type="button" data-mode="book">Book</button>
        <button type="button" data-mode="rsvp">RSVP</button>
      </div>
      <div class="header-panels">
        <button type="button" data-overlay="library">Library</button>
        <button type="button" data-overlay="stats">Stats</button>
      </div>
    </header>`;

  el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) =>
    btn.addEventListener('click', () =>
      store.set({ settings: { ...store.get().settings, mode: btn.dataset.mode as Mode } }),
    ),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-overlay]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const target = btn.dataset.overlay as 'library' | 'stats';
      store.set({ overlay: store.get().overlay === target ? null : target });
    }),
  );

  store.subscribe((state) => {
    el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.mode === state.settings.mode),
    );
  });
  store.set({}); // initial paint
}

export function mountToolbar(el: HTMLElement, store: Store<State>, hooks: ToolbarHooks): void {
  el.innerHTML = `
    <div class="toolbar">
      <button type="button" class="play">▶</button>
      <label>Speed <b class="wpm-value"></b> wpm
        <input class="wpm" type="range" min="${WPM_MIN}" max="${WPM_MAX}" step="10">
      </label>
      <label>Chunk <b class="chunk-value"></b>
        <input class="chunk" type="range" min="1" max="5" step="1">
      </label>
      <label>Font
        <input class="font" type="number" min="14" max="24">
      </label>
      <label class="auto"><input class="autoprogress" type="checkbox"> +10 wpm / 2 min</label>
      <button type="button" class="open">Open file</button>
      <button type="button" class="reset">Reset</button>
    </div>`;

  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const playBtn = q<HTMLButtonElement>('.play');
  const wpmInput = q<HTMLInputElement>('.wpm');
  const chunkInput = q<HTMLInputElement>('.chunk');
  const fontInput = q<HTMLInputElement>('.font');
  const autoInput = q<HTMLInputElement>('.autoprogress');

  const patchSettings = (patch: Partial<State['settings']>) =>
    store.set({ settings: { ...store.get().settings, ...patch } });

  playBtn.addEventListener('click', hooks.onTogglePlay);
  wpmInput.addEventListener('input', () => patchSettings({ wpm: +wpmInput.value }));
  chunkInput.addEventListener('input', () => patchSettings({ chunkSize: +chunkInput.value }));
  fontInput.addEventListener('input', () => {
    const v = +fontInput.value;
    if (v >= 14 && v <= 24) patchSettings({ fontSize: v });
  });
  autoInput.addEventListener('change', () => patchSettings({ autoProgress: autoInput.checked }));
  q<HTMLButtonElement>('.open').addEventListener('click', hooks.onOpenFile);
  q<HTMLButtonElement>('.reset').addEventListener('click', hooks.onReset);

  function render(state: State): void {
    playBtn.textContent = state.running ? '⏸' : '▶';
    wpmInput.value = String(state.settings.wpm);
    q('.wpm-value').textContent = String(state.settings.wpm);
    chunkInput.value = String(state.settings.chunkSize);
    q('.chunk-value').textContent = String(state.settings.chunkSize);
    fontInput.value = String(state.settings.fontSize);
    autoInput.checked = state.settings.autoProgress;
  }

  render(store.get());
  store.subscribe(render);
}

export function bindHotkeys(store: Store<State>, hooks: ToolbarHooks): void {
  document.addEventListener('keydown', (e) => {
    const settings = store.get().settings;
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      hooks.onTogglePlay();
    } else if (e.key === 'ArrowRight') {
      store.set({ settings: { ...settings, wpm: Math.min(settings.wpm + 25, WPM_MAX) } });
    } else if (e.key === 'ArrowLeft') {
      store.set({ settings: { ...settings, wpm: Math.max(settings.wpm - 25, WPM_MIN) } });
    } else if (e.key === 'F5') {
      e.preventDefault();
      hooks.onReset();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      hooks.onOpenFile();
    }
  });
}
```

- [ ] **Step 2: Append toolbar/header styles to src/styles.css**

```css
/* Header */

.header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: var(--ivory);
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  margin-right: auto;
}

.header button,
.toolbar button {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--warm-sand);
  color: var(--text-secondary);
  cursor: pointer;
}

.header button.active {
  background: var(--brand);
  border-color: var(--brand);
  color: var(--ivory);
}

/* Toolbar */

.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 16px;
  background: var(--ivory);
  border-top: 1px solid var(--border);
}

.toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.toolbar input[type='range'] {
  accent-color: var(--brand);
}

.toolbar input[type='number'] {
  width: 52px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--ivory);
}

.toolbar .play {
  background: var(--brand);
  color: var(--ivory);
  border-color: var(--brand);
  min-width: 44px;
}

body {
  padding-bottom: 64px; /* room for fixed toolbar */
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/toolbar.ts src/styles.css
git commit -m "feat: header, toolbar, hotkeys"
```

---

### Task 8: Text loader (paste / file / drag&drop) + toast

**Files:**
- Create: `src/ui/loader.ts`
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Write src/ui/loader.ts**

```ts
import { splitWords } from '../engine';
import type { Store } from '../store';
import type { LibraryText, State } from '../types';

export function makeTitle(content: string): string {
  const firstLine = content.trim().split('\n')[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

export function addText(store: Store<State>, content: string): void {
  const trimmed = content.trim();
  const text: LibraryText = {
    id: crypto.randomUUID(),
    title: makeTitle(trimmed),
    content: trimmed,
    position: 0,
    addedAt: Date.now(),
  };
  const state = store.get();
  store.set({
    library: [text, ...state.library],
    settings: { ...state.settings, activeTextId: text.id },
    words: splitWords(trimmed),
    position: 0,
    running: false,
  });
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string): void {
  let el = document.querySelector<HTMLElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('show'), 3000);
}

/** Wires paste, hidden file input, and window drag&drop. Returns openFile trigger. */
export function mountLoader(store: Store<State>): { openFile(): void } {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'text/plain';
  input.hidden = true;
  document.body.append(input);

  function loadFile(file: File | undefined): void {
    if (!file || !file.type.match('text.*')) {
      toast('Not a text file — drop or pick a .txt');
      return;
    }
    file.text().then((content) => {
      if (content.trim()) addText(store, content);
      else toast('File is empty');
    });
  }

  input.addEventListener('change', () => {
    loadFile(input.files?.[0]);
    input.value = '';
  });

  document.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text') ?? '';
    if (text.trim()) {
      e.preventDefault();
      addText(store, text);
    } else {
      toast('Clipboard has no text');
    }
  });

  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    loadFile(e.dataTransfer?.files[0]);
  });

  return { openFile: () => input.click() };
}
```

- [ ] **Step 2: Append toast styles to src/styles.css**

```css
/* Toast */

.toast {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translate(-50%, 8px);
  background: var(--deep-dark);
  color: var(--ivory);
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}

.toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/loader.ts src/styles.css
git commit -m "feat: text loading via paste, file picker, drag&drop"
```

---

### Task 9: Library and stats overlays

**Files:**
- Create: `src/panels/library.ts`, `src/panels/stats.ts`
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Write src/panels/library.ts**

```ts
import { splitWords } from '../engine';
import type { Store } from '../store';
import type { State } from '../types';

export function mountLibrary(el: HTMLElement, store: Store<State>): void {
  function render(state: State): void {
    el.classList.toggle('open', state.overlay === 'library');
    if (state.overlay !== 'library') return;
    el.innerHTML = `<div class="panel"><h2>Library</h2><ul class="library-list"></ul></div>`;
    const list = el.querySelector<HTMLElement>('.library-list')!;
    if (!state.library.length) {
      list.innerHTML = '<li class="empty">Paste text (Ctrl+V) or open a file (Ctrl+O)</li>';
      return;
    }
    for (const text of state.library) {
      const words = splitWords(text.content);
      const pct = words.length ? Math.round((text.position / words.length) * 100) : 0;
      const li = document.createElement('li');
      li.className = text.id === state.settings.activeTextId ? 'active' : '';
      li.innerHTML = `
        <button type="button" class="pick">
          <span class="title"></span>
          <span class="meta">${words.length} words · ${pct}%</span>
        </button>
        <button type="button" class="del" aria-label="Delete">×</button>`;
      li.querySelector<HTMLElement>('.title')!.textContent = text.title;
      li.querySelector<HTMLButtonElement>('.pick')!.addEventListener('click', () => {
        store.set({
          settings: { ...store.get().settings, activeTextId: text.id },
          words,
          position: text.position,
          running: false,
          overlay: null,
        });
      });
      li.querySelector<HTMLButtonElement>('.del')!.addEventListener('click', () => {
        const s = store.get();
        const library = s.library.filter((t) => t.id !== text.id);
        const wasActive = s.settings.activeTextId === text.id;
        store.set({
          library,
          ...(wasActive && {
            settings: { ...s.settings, activeTextId: null },
            words: [],
            position: 0,
            running: false,
          }),
        });
      });
      list.append(li);
    }
  }

  render(store.get());
  store.subscribe(render);
}
```

- [ ] **Step 2: Write src/panels/stats.ts**

```ts
import type { Store } from '../store';
import type { Session, State } from '../types';

function chart(sessions: Session[]): string {
  if (sessions.length < 2) return '<p class="empty">Read at least two sessions to see the chart.</p>';
  const w = 560;
  const h = 160;
  const pad = 24;
  const xs = sessions.map((s) => s.date);
  const ys = sessions.map((s) => s.wpm);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const px = (x: number) => pad + ((x - minX) / Math.max(maxX - minX, 1)) * (w - 2 * pad);
  const py = (y: number) => h - pad - ((y - minY) / Math.max(maxY - minY, 1)) * (h - 2 * pad);
  const points = sessions.map((s) => `${px(s.date).toFixed(1)},${py(s.wpm).toFixed(1)}`).join(' ');
  const dots = sessions
    .map((s) => `<circle cx="${px(s.date).toFixed(1)}" cy="${py(s.wpm).toFixed(1)}" r="3" fill="#1b365d"/>`)
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="stats-chart" role="img" aria-label="wpm over time">
    <text x="${pad}" y="14" class="axis">${maxY} wpm</text>
    <text x="${pad}" y="${h - 8}" class="axis">${minY} wpm</text>
    <polyline points="${points}" fill="none" stroke="#1b365d" stroke-width="2"/>
    ${dots}
  </svg>`;
}

export function mountStats(el: HTMLElement, store: Store<State>): void {
  function render(state: State): void {
    el.classList.toggle('open', state.overlay === 'stats');
    if (state.overlay !== 'stats') return;
    const recent = [...state.sessions].slice(-10).reverse();
    const rows = recent
      .map(
        (s) => `<tr>
          <td>${new Date(s.date).toLocaleDateString()}</td>
          <td>${s.words}</td>
          <td>${s.minutes.toFixed(1)}</td>
          <td><b>${s.wpm}</b></td>
        </tr>`,
      )
      .join('');
    el.innerHTML = `
      <div class="panel">
        <h2>Stats</h2>
        ${chart([...state.sessions].sort((a, b) => a.date - b.date))}
        <table class="stats-table">
          <thead><tr><th>Date</th><th>Words</th><th>Min</th><th>wpm</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty">No sessions yet</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  render(store.get());
  store.subscribe(render);
}
```

- [ ] **Step 3: Append panel styles to src/styles.css**

```css
/* Overlay panels */

.overlay {
  display: none;
}

.overlay.open {
  display: block;
  position: fixed;
  top: 57px;
  right: 0;
  bottom: 56px;
  width: min(420px, 100%);
  overflow-y: auto;
  background: var(--ivory);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 16px rgb(20 20 19 / 0.06);
  z-index: 10;
}

.panel {
  padding: 20px;
}

.panel h2 {
  font-family: var(--font-serif);
  font-size: 16px;
  margin: 0 0 16px;
}

.panel .empty {
  color: var(--text-meta);
  font-size: 13px;
}

.library-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.library-list li {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.library-list li.active .pick {
  border-color: var(--brand);
}

.library-list .pick {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  padding: 10px 12px;
  background: var(--parchment);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.library-list .title {
  font-family: var(--font-serif);
  font-size: 14px;
  color: var(--text);
}

.library-list .meta {
  font-size: 11px;
  color: var(--text-meta);
}

.library-list .del {
  border: 1px solid var(--border);
  background: none;
  border-radius: 8px;
  color: var(--text-meta);
  width: 32px;
  cursor: pointer;
}

.stats-chart {
  width: 100%;
  background: var(--parchment);
  border-radius: 8px;
  margin-bottom: 16px;
}

.stats-chart .axis {
  font-size: 10px;
  fill: #87867f;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.stats-table th {
  text-align: left;
  color: var(--text-meta);
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stats-table td,
.stats-table th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/panels/library.ts src/panels/stats.ts src/styles.css
git commit -m "feat: library and stats overlays with SVG progress chart"
```

---

### Task 10: Composition — main.ts playback glue

**Files:**
- Modify: `src/main.ts` (replace placeholder)

This is the integration heart: playback player, mode switching, session recording, auto-progression, persistence wiring.

- [ ] **Step 1: Write src/main.ts**

```ts
import './styles.css';
import {
  chunkEnd,
  createPlayer,
  finishSession,
  progressWpm,
  rsvpDelayMs,
  splitWords,
  tickMs,
  type SessionTracker,
} from './engine';
import { load, save } from './persist';
import { createStore } from './store';
import { mountBook } from './modes/book';
import { mountRsvp } from './modes/rsvp';
import { mountLibrary } from './panels/library';
import { mountStats } from './panels/stats';
import { bindHotkeys, mountHeader, mountToolbar } from './ui/toolbar';
import { mountLoader, toast } from './ui/loader';
import type { State } from './types';

// --- state ---

const persisted = load();
const activeText = persisted.library.find((t) => t.id === persisted.settings.activeTextId) ?? null;

const store = createStore<State>({
  settings: activeText ? persisted.settings : { ...persisted.settings, activeTextId: null },
  library: persisted.library,
  sessions: persisted.sessions,
  words: activeText ? splitWords(activeText.content) : [],
  position: activeText?.position ?? 0,
  running: false,
  overlay: null,
});

// --- playback ---

let tracker: SessionTracker | null = null;
let progressBase = 0; // wpm at play start, for auto-progression

const player = createPlayer({
  getDelay() {
    const { settings, words, position } = store.get();
    return settings.mode === 'rsvp'
      ? rsvpDelayMs(words[position] ?? '', settings.wpm)
      : tickMs(settings.wpm, settings.chunkSize);
  },
  onTick() {
    const state = store.get();
    const step = state.settings.mode === 'rsvp' ? 1 : state.settings.chunkSize;
    const next = chunkEnd(state.position, step, state.words.length);
    const patch: Partial<State> = { position: next };
    if (state.settings.autoProgress && tracker) {
      const wpm = progressWpm(progressBase, Date.now() - tracker.startedAt);
      if (wpm !== state.settings.wpm) patch.settings = { ...state.settings, wpm };
    }
    store.set(patch);
    if (next >= state.words.length) stop();
  },
});

function start(): void {
  const state = store.get();
  if (!state.words.length) {
    toast('No text — paste (Ctrl+V) or open a file (Ctrl+O)');
    return;
  }
  if (state.position >= state.words.length) store.set({ position: 0 });
  tracker = { startedAt: Date.now(), startPosition: store.get().position };
  progressBase = state.settings.wpm;
  player.start();
  store.set({ running: true });
}

function stop(): void {
  player.stop();
  if (tracker) {
    const session = finishSession(tracker, Date.now(), store.get().position);
    if (session) store.set({ sessions: [...store.get().sessions, session] });
    tracker = null;
  }
  store.set({ running: false });
}

const hooks = {
  onTogglePlay: () => (store.get().running ? stop() : start()),
  onOpenFile: () => loader.openFile(),
  onReset: () => {
    stop();
    store.set({ position: 0 });
  },
};

// --- mount ---

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="header"></div>
  <div id="reader"></div>
  <div id="library" class="overlay"></div>
  <div id="stats" class="overlay"></div>
  <div id="toolbar"></div>`;

const readerEl = app.querySelector<HTMLElement>('#reader')!;
const bookEl = document.createElement('div');
const rsvpEl = document.createElement('div');
readerEl.append(bookEl, rsvpEl);

mountHeader(app.querySelector('#header')!, store);
mountBook(bookEl, store);
mountRsvp(rsvpEl, store);
mountLibrary(app.querySelector('#library')!, store);
mountStats(app.querySelector('#stats')!, store);
mountToolbar(app.querySelector('#toolbar')!, store, hooks);
const loader = mountLoader(store);
bindHotkeys(store, hooks);

// mode visibility (pause on switch, keep position)
store.subscribe((state) => {
  bookEl.style.display = state.settings.mode === 'book' ? '' : 'none';
  rsvpEl.style.display = state.settings.mode === 'rsvp' ? '' : 'none';
});
store.set({}); // initial paint

// --- persistence ---

let saveTimer: ReturnType<typeof setTimeout> | undefined;
store.subscribe((state) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const library = state.library.map((t) =>
      t.id === state.settings.activeTextId ? { ...t, position: state.position } : t,
    );
    if (!save({ settings: state.settings, library, sessions: state.sessions })) {
      toast('Storage full — text too large to save');
    }
  }, 500);
});

```

- [ ] **Step 2: Typecheck + full test suite**

Run: `npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 3: Manual smoke (dev server)**

Run: `npm run dev`
Check: paste text → appears + saved to library; play in book mode → chunk runs, click word rewinds; switch to RSVP → word with blue ORP letter, punctuation pauses visible; space/←→/F5/Ctrl+O work; library lists texts with %; stats records a session after >10s of reading; reload page → position and settings restored.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire playback, sessions, persistence in main"
```

---

### Task 11: Mode switch pauses playback + position sync into library

**Files:**
- Modify: `src/main.ts`

Switching mode mid-run keeps the timer running with the wrong delay model. Pause on mode change.

- [ ] **Step 1: Add mode-change watcher in main.ts**

Insert after the mode visibility subscription:

```ts
let lastMode = store.get().settings.mode;
store.subscribe((state) => {
  if (state.settings.mode !== lastMode) {
    lastMode = state.settings.mode;
    if (state.running) stop();
  }
});
```

- [ ] **Step 2: Verify behaviour manually**

Run: `npm run dev`
Check: start playback in book mode, switch to RSVP → playback pauses, position preserved.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "fix: pause playback on mode switch"
```

---

### Task 12: README + cleanup

**Files:**
- Modify: `README.md`
- Delete: leftover React-era files if any remain (`src/styles.css` is reused — keep)

- [ ] **Step 1: Rewrite README.md**

```markdown
# Speed Reading Trainer

Train your reading speed. Two modes, zero dependencies, all data local.

- **Book** — warm paper page; a moving chunk (1–5 words) paces your eyes.
  Click any word to rewind. Progress bar with time estimate.
- **RSVP** — one word at a time on a dark stage, ORP letter highlighted,
  automatic pauses at punctuation and long words.

## Features

- Speed 60–600 wpm, optional auto-progression (+10 wpm every 2 min)
- Text library with per-text progress (localStorage)
- Session stats with an SVG progress chart
- Load text: paste (`Ctrl+V`), file (`Ctrl+O`), or drag & drop
- Hotkeys: `Space` play/pause, `←/→` speed, `F5` reset

## Development

```sh
npm install
npm run dev      # dev server
npm test         # unit tests (Vitest)
npm run build    # typecheck + production build
```

Vanilla TypeScript + Vite. No runtime dependencies.

### Design notes

Built on reading research (Rayner et al. 2016): chunk highlighting works as a
*pacer*, not "reading word groups"; regressions (re-reading) matter for
comprehension — hence click-to-rewind; speeds above ~600 wpm trade away
comprehension, so the slider stops there.
```

- [ ] **Step 2: Verify whole pipeline**

Run: `npm run build && npm test`
Expected: clean build, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README for vanilla version"
```

---

### Task 13: Ship

- [ ] **Step 1: Final verification**

```bash
npm run build && npm test && npm run preview -- --port 4173 &
sleep 2 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/
kill %1
```

Expected: build clean, tests pass, HTTP 200.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin vanilla
gh pr create --base main --title "Vanilla TS rewrite: book pacer + RSVP, stats, library" \
  --body "Implements docs/superpowers/specs/2026-06-06-vanilla-rewrite-design.md. Zero runtime deps. Vitest suite for engine/persist/store/book."
```

- [ ] **Step 3: Confirm with user before merge**
