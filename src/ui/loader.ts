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

/** Wires paste, hidden file input, and window drag&drop. Returns openFile/pasteFromClipboard triggers. */
export function mountLoader(store: Store<State>): {
  openFile(): void;
  pasteFromClipboard(): void;
} {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'text/plain';
  input.hidden = true;
  document.body.append(input);

  function loadFile(file: File | undefined): void {
    const isText =
      file && (/^text\//.test(file.type) || (file.type === '' && file.name.endsWith('.txt')));
    if (!file || !isText) {
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
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
    const text = e.clipboardData?.getData('text') ?? '';
    if (text.trim()) {
      e.preventDefault();
      addText(store, text);
    } else {
      toast('Clipboard has no text');
    }
  });

  // visual drop target: highlight the whole window while a file is dragged over it
  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth += 1;
    document.body.classList.add('dragging');
  });
  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove('dragging');
  });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    loadFile(e.dataTransfer?.files[0]);
  });

  /** Toolbar "Paste" button: Clipboard API with a hotkey fallback hint. */
  function pasteFromClipboard(): void {
    if (!navigator.clipboard?.readText) {
      toast('Clipboard unavailable — press Ctrl+V instead');
      return;
    }
    navigator.clipboard.readText().then(
      (text) => {
        if (text.trim()) addText(store, text);
        else toast('Clipboard has no text');
      },
      () => toast('Clipboard access denied — press Ctrl+V instead'),
    );
  }

  return { openFile: () => input.click(), pasteFromClipboard };
}
