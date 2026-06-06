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
