import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  WPM_MAX,
  WPM_MIN,
  chunkEnd,
  createPlayer,
  finishSession,
  minutesLeft,
  orpIndex,
  progressWpm,
  rsvpDelayMs,
  splitWords,
  tickMs,
} from '../src/engine';

describe('splitWords', () => {
  it('splits on any whitespace, drops empties', () => {
    expect(splitWords('  one\n two\tthree ')).toEqual(['one', 'two', 'three']);
  });
});

describe('chunkEnd', () => {
  it('advances by chunk size', () => {
    expect(chunkEnd(0, 3, 100)).toBe(3);
  });
  it('clamps to total', () => {
    expect(chunkEnd(98, 5, 100)).toBe(100);
  });
});

describe('tickMs', () => {
  it('is 60000/wpm per word times chunk size', () => {
    expect(tickMs(300, 1)).toBe(200);
    expect(tickMs(300, 3)).toBe(600);
  });
});

describe('rsvpDelayMs', () => {
  it('base delay for plain short word', () => {
    expect(rsvpDelayMs('cat', 300)).toBe(200);
  });
  it('x2 after sentence punctuation', () => {
    expect(rsvpDelayMs('end.', 300)).toBe(400);
    expect(rsvpDelayMs('really?', 300)).toBe(400);
  });
  it('x1.3 after comma', () => {
    expect(rsvpDelayMs('pause,', 300)).toBeCloseTo(260);
  });
  it('x1.5 for words with 8+ letters', () => {
    expect(rsvpDelayMs('typography', 300)).toBe(300);
  });
  it('long word + sentence end takes the larger multiplier', () => {
    expect(rsvpDelayMs('typography.', 300)).toBe(400);
  });
});

describe('orpIndex', () => {
  it('is ~35% into the word', () => {
    expect(orpIndex('a')).toBe(0);
    expect(orpIndex('word')).toBe(1); // (4-1)*0.35 = 1.05 -> 1
    expect(orpIndex('typography')).toBe(3); // 9*0.35 = 3.15 -> 3
  });
});

describe('progressWpm', () => {
  it('+10 per full 2 minutes', () => {
    expect(progressWpm(250, 4 * 60_000)).toBe(270);
  });
  it('no bump before 2 minutes', () => {
    expect(progressWpm(250, 119_000)).toBe(250);
  });
  it('caps at WPM_MAX', () => {
    expect(progressWpm(WPM_MAX - 5, 10 * 60_000)).toBe(WPM_MAX);
  });
  it('uses WPM_MIN in the API', () => {
    expect(WPM_MIN).toBe(60);
  });
});

describe('minutesLeft', () => {
  it('remaining words / wpm, rounded up', () => {
    expect(minutesLeft(1000, 400, 300)).toBe(2); // 600 words @300wpm
  });
});

describe('finishSession', () => {
  it('returns null for sessions under 10s', () => {
    expect(finishSession({ startedAt: 0, startPosition: 0 }, 9_000, 50)).toBeNull();
  });
  it('computes words, minutes, effective wpm', () => {
    const s = finishSession({ startedAt: 0, startPosition: 100 }, 60_000, 400);
    expect(s).toEqual({ date: 0, words: 300, minutes: 1, wpm: 300 });
  });
});

describe('createPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks repeatedly using getDelay', () => {
    const onTick = vi.fn();
    const p = createPlayer({ getDelay: () => 100, onTick });
    p.start();
    vi.advanceTimersByTime(350);
    expect(onTick).toHaveBeenCalledTimes(3);
    p.stop();
    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(3);
  });
});
