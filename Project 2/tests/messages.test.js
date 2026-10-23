import { describe, it, expect, vi } from 'vitest';
import { showMessage, subscribe, getMessages } from '../src/state/messages.js';

describe('message store', () => {
  it('adds and removes messages and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    const hide = showMessage('Loading…');
    expect(getMessages()).toEqual([expect.objectContaining({ text: 'Loading…', type: 'info' })]);

    hide();
    expect(getMessages()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('returns a new array on change so React detects updates', () => {
    const before = getMessages();
    const hide = showMessage('Oops', 'error');
    expect(getMessages()).not.toBe(before);
    expect(getMessages().at(-1).type).toBe('error');
    hide();
  });
});
