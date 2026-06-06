import { chunkEnd, minutesLeft } from '../engine';
import type { Store } from '../store';
import type { State } from '../types';
import { OPEN_KEYS, PASTE_KEYS } from '../ui/platform';

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
    if (!words.length) {
      const hint = document.createElement('p');
      hint.className = 'book-empty';
      hint.textContent = `Paste text (${PASTE_KEYS}), open a file (${OPEN_KEYS}), or drop a .txt anywhere`;
      textEl.append(hint);
      renderedWords = words;
      return;
    }
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.addEventListener('click', () => store.set({ position: i }));
      textEl.append(span, document.createTextNode(' '));
    });
    renderedWords = words;
  }

  /** Keep the active chunk visible while the pacer runs. */
  function scrollChunkIntoView(span: HTMLElement): void {
    if (typeof span.scrollIntoView !== 'function') return; // jsdom
    const rect = span.getBoundingClientRect();
    const headerRoom = 80; // sticky header + breathing space
    const toolbarRoom = 96; // fixed bottom toolbar
    if (rect.top < headerRoom || rect.bottom > window.innerHeight - toolbarRoom) {
      span.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
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
    if (state.running && spans[state.position]) scrollChunkIntoView(spans[state.position]);
    const pct = state.words.length ? Math.round((state.position / state.words.length) * 100) : 0;
    fillEl.style.width = `${pct}%`;
    pctEl.textContent = `${pct}%`;
    etaEl.textContent = `~${minutesLeft(state.words.length, state.position, state.settings.wpm)} min left`;
  }

  render(store.get());
  store.subscribe(render);
}
