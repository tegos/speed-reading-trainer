# Speed Reading Trainer

Train your reading speed in the browser. Two modes, zero runtime dependencies, all data stays on your machine.

**[Try it live →](https://tegos.github.io/speed-reading-trainer/)**

<p align="center">
  <img src="https://raw.githubusercontent.com/tegos/speed-reading-trainer/main/assets/hero.webp" alt="Demo: Book mode pacer highlighting chunks, then RSVP mode flashing words with ORP accent" width="880">
</p>

## Why

Most adults read at 200–300 wpm. Reading faster is mostly a pacing problem: the eyes wander, re-read out of habit, and linger longer than recognition requires. This trainer gives your eyes a metronome — a moving highlight or a flashing word — so you read at a deliberate, gradually increasing pace instead of an accidental one.

It is grounded in reading research rather than speed-reading hype: the speed slider stops at 600 wpm, because beyond that comprehension measurably drops (see [The science](#the-science) below).

## Modes

### Book

A warm paper page. A moving highlight over a chunk of 1–5 words paces your eyes down the text; the page autoscrolls to keep the chunk in view. Click any word to rewind to it — re-reading is part of comprehension, not a failure. A progress bar shows position and estimated time remaining.

### RSVP

A dark stage showing one word at a time, centered, with the optimal recognition point (ORP) letter accented so your eyes never have to move. Pauses automatically: ×2 at sentence-ending punctuation, ×1.3 at commas, ×1.5 at long words.

## Usage

1. Open the [live demo](https://tegos.github.io/speed-reading-trainer/). A demo text (“How fast can you read?”) is preloaded when the library is empty.
2. Load your own text: the **Paste** button or `Ctrl+V`, the file picker (`Ctrl+O`), or drag & drop a file onto the page. Shortcuts show as `⌘V` / `⌘O` on macOS.
3. Pick a mode, press `Space`, read.
4. Adjust speed with the slider or `←`/`→` (±25 wpm). Optional auto-progression adds +10 wpm every 2 minutes.
5. Come back anytime — per-text progress, the text library, and session stats (with a wpm chart) live in localStorage.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` / `→` | Speed −25 / +25 wpm |
| `Ctrl+V` (`⌘V`) | Paste text |
| `Ctrl+O` (`⌘O`) | Open file |
| `F5` | Reset to start |

## Features

- Speed 60–600 wpm, optional auto-progression (+10 wpm every 2 min)
- Text library with per-text progress, stored in localStorage
- Session stats with an SVG wpm chart
- Click-to-rewind in Book mode
- Auto-pauses at punctuation, commas, and long words in RSVP mode
- Platform-aware shortcut labels (`⌘` on macOS)
- No accounts, no servers, no tracking — everything stays in your browser

## Development

```sh
npm install
npm run dev      # dev server
npm test         # unit tests (Vitest)
npm run build    # typecheck + production build
```

Vanilla TypeScript + Vite, no runtime dependencies.

## The science

Built on reading research (Rayner et al., 2016, *So Much to Read, So Little Time*):

- Chunk highlighting works as a **pacer**, not as “reading word groups” — the benefit is rhythm, not magic.
- **Regressions** (re-reading) matter for comprehension — hence click-to-rewind instead of forced forward-only flow.
- Speeds above ~600 wpm trade away comprehension, so the slider deliberately stops there.

## License

[MIT](LICENSE)
