import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/store';

describe('createStore', () => {
  it('returns initial state', () => {
    const s = createStore({ a: 1 });
    expect(s.get()).toEqual({ a: 1 });
  });

  it('merges patches and notifies subscribers', () => {
    const s = createStore({ a: 1, b: 'x' });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 2 });
    expect(s.get()).toEqual({ a: 2, b: 'x' });
    expect(fn).toHaveBeenCalledWith({ a: 2, b: 'x' });
  });

  it('unsubscribe stops notifications', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.set({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
