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
import { DEMO_TEXT } from './demo-text';
import type { LibraryText, State } from './types';
import { OPEN_KEYS, PASTE_KEYS } from './ui/platform';

// --- state ---

const persisted = load();

// empty library → seed the standard reading test so there is always something to read
if (!persisted.library.length) {
  const demo: LibraryText = {
    id: 'demo',
    title: 'How fast can you read?',
    content: DEMO_TEXT,
    position: 0,
    addedAt: Date.now(),
  };
  persisted.library = [demo];
  persisted.settings = { ...persisted.settings, activeTextId: demo.id };
}

// dangling activeTextId (text deleted in a past session) → fall back to the first text
const activeText =
  persisted.library.find((t) => t.id === persisted.settings.activeTextId) ??
  persisted.library[0] ??
  null;

const store = createStore<State>({
  settings: { ...persisted.settings, activeTextId: activeText?.id ?? null },
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
    toast(`No text — paste (${PASTE_KEYS}) or open a file (${OPEN_KEYS})`);
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
  onPaste: () => loader.pasteFromClipboard(),
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

// mode visibility (keep position on switch)
store.subscribe((state) => {
  bookEl.style.display = state.settings.mode === 'book' ? '' : 'none';
  rsvpEl.style.display = state.settings.mode === 'rsvp' ? '' : 'none';
});

// switching mode mid-run keeps the timer on the wrong delay model — pause instead
let lastMode = store.get().settings.mode;
store.subscribe((state) => {
  if (state.settings.mode !== lastMode) {
    lastMode = state.settings.mode;
    if (state.running) stop();
  }
});

// external running:false (e.g. loader on new text) must actually stop the player
store.subscribe((state) => {
  if (!state.running && player.running) stop();
});

store.set({}); // initial paint

// --- persistence ---

function persistNow(state: State): void {
  const library = state.library.map((t) =>
    t.id === state.settings.activeTextId ? { ...t, position: state.position } : t,
  );
  if (!save({ settings: state.settings, library, sessions: state.sessions })) {
    toast('Storage full — text too large to save');
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
store.subscribe((state) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistNow(state), 500);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(saveTimer);
    persistNow(store.get());
  }
});
