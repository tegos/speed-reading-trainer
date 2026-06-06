import { splitWords } from '../engine';
import type { Store } from '../store';
import type { State } from '../types';

export function mountLibrary(el: HTMLElement, store: Store<State>): void {
  let renderedKey = ''; // skip full rebuild when list contents are unchanged (e.g. playback ticks)

  function render(state: State): void {
    el.classList.toggle('open', state.overlay === 'library');
    if (state.overlay !== 'library') {
      renderedKey = '';
      return;
    }
    const key =
      state.library.map((t) => `${t.id}:${t.position}`).join('|') +
      `@${state.settings.activeTextId}`;
    if (key === renderedKey) return;
    renderedKey = key;
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
