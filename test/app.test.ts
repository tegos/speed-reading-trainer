import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('app boot', () => {
  beforeEach(() => {
    vi.resetModules(); // main.ts runs on import — force a fresh boot per test
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('fresh profile renders the seeded demo text', async () => {
    await import('../src/main');
    const spans = document.querySelectorAll('span.word');
    expect(spans.length).toBeGreaterThan(200); // demo passage ~280 words
    expect(document.querySelector('.book-text')!.textContent).toContain('How fast can you read?');
  });

  it('stale profile (sessions exist, library empty) still seeds the demo', async () => {
    localStorage.setItem('srt:sessions', JSON.stringify([{ date: 1, words: 100, minutes: 1, wpm: 100 }]));
    localStorage.setItem('srt:library', '[]');
    await import('../src/main');
    const text = document.querySelector('.book-text')!;
    expect(text.textContent).toContain('How fast can you read?');
  });

  it('dangling activeTextId falls back to the first library text', async () => {
    localStorage.setItem(
      'srt:library',
      JSON.stringify([{ id: 't1', title: 'T', content: 'alpha beta gamma', position: 1, addedAt: 1 }]),
    );
    localStorage.setItem('srt:settings', JSON.stringify({ activeTextId: 'deleted-id' }));
    await import('../src/main');
    expect(document.querySelectorAll('span.word')).toHaveLength(3);
  });
});
