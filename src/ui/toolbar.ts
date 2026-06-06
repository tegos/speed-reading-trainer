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
    el.querySelectorAll<HTMLButtonElement>('[data-overlay]').forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.overlay === state.overlay),
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
    const onControl =
      e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement;
    if (e.code === 'Space' && !onControl) {
      e.preventDefault();
      hooks.onTogglePlay();
    } else if (e.key === 'ArrowRight' && !onControl) {
      store.set({ settings: { ...settings, wpm: Math.min(settings.wpm + 25, WPM_MAX) } });
    } else if (e.key === 'ArrowLeft' && !onControl) {
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
