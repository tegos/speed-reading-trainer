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
