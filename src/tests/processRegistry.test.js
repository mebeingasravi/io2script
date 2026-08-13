import { describe, test, expect, beforeEach } from '@jest/globals';
import processRegistry from '../services/processRegistry.js';

describe('processRegistry', () => {
  beforeEach(() => {
    processRegistry.clear();
  });

  test('has() is false for an untracked script', () => {
    expect(processRegistry.has('unknown')).toBe(false);
  });

  test('set()/get() stores and retrieves an entry', () => {
    const entry = { pid: 123, child: {} };
    processRegistry.set('script-1', entry);

    expect(processRegistry.has('script-1')).toBe(true);
    expect(processRegistry.get('script-1')).toBe(entry);
  });

  test('remove() deletes a tracked entry', () => {
    processRegistry.set('script-1', { pid: 123, child: {} });
    processRegistry.remove('script-1');

    expect(processRegistry.has('script-1')).toBe(false);
    expect(processRegistry.get('script-1')).toBeUndefined();
  });

  test('clear() removes every tracked entry', () => {
    processRegistry.set('a', { pid: 1, child: {} });
    processRegistry.set('b', { pid: 2, child: {} });

    processRegistry.clear();

    expect(processRegistry.has('a')).toBe(false);
    expect(processRegistry.has('b')).toBe(false);
  });
});
