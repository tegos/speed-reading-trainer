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

/** RSVP: ms for one word, with punctuation / long-word slowdowns. */
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
