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

  it('shows an empty-state hint when there are no words', () => {
    const store = createStore(makeState({ words: [], position: 0 }));
    const el = document.createElement('div');
    mountBook(el, store);
    expect(el.querySelector('.book-empty')).not.toBeNull();
    expect(el.querySelector('.book-empty')!.textContent).toContain('Ctrl+V');
  });
});
