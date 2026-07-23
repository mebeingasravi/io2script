import { describe, test, expect } from '@jest/globals';
import { parseCsvLine, mapRowToObject } from '../utils/csvLineParser.js';

describe('parseCsvLine', () => {
  test('parses a simple comma-separated line', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  test('parses a quoted field containing commas', () => {
    const line = 'TXN1,"Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)",BUY';
    expect(parseCsvLine(line)).toEqual([
      'TXN1',
      'Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)',
      'BUY',
    ]);
  });

  test('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsvLine('"say ""hi""",b')).toEqual(['say "hi"', 'b']);
  });

  test('returns a single empty field for an empty string', () => {
    expect(parseCsvLine('')).toEqual(['']);
  });

  test('handles trailing empty field', () => {
    expect(parseCsvLine('a,b,')).toEqual(['a', 'b', '']);
  });

  test('supports a custom delimiter', () => {
    expect(parseCsvLine('a|b|c', '|')).toEqual(['a', 'b', 'c']);
  });
});

describe('mapRowToObject', () => {
  test('maps headers to values by position', () => {
    expect(mapRowToObject(['id', 'name'], ['1', 'foo'])).toEqual({ id: '1', name: 'foo' });
  });

  test('fills missing trailing values with empty string', () => {
    expect(mapRowToObject(['id', 'name', 'extra'], ['1', 'foo'])).toEqual({
      id: '1',
      name: 'foo',
      extra: '',
    });
  });

  test('ignores extra values beyond header length', () => {
    expect(mapRowToObject(['id'], ['1', 'foo'])).toEqual({ id: '1' });
  });
});
