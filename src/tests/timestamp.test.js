import { describe, test, expect } from '@jest/globals';
import { parseTickTimestamp, compareTickTiming } from '../utils/timestamp.js';

describe('parseTickTimestamp', () => {
  test('parses a native Date.toString()-style timestamp', () => {
    const ms = parseTickTimestamp('Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)');
    expect(ms).toBe(new Date('Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)').getTime());
    expect(Number.isNaN(ms)).toBe(false);
  });

  test('parses a raw numeric epoch millisecond string', () => {
    expect(parseTickTimestamp('1721450901000')).toBe(1721450901000);
  });

  test('returns NaN for an empty string', () => {
    expect(Number.isNaN(parseTickTimestamp(''))).toBe(true);
  });

  test('returns NaN for null/undefined', () => {
    expect(Number.isNaN(parseTickTimestamp(undefined))).toBe(true);
    expect(Number.isNaN(parseTickTimestamp(null))).toBe(true);
  });

  test('returns NaN for an unparsable string', () => {
    expect(Number.isNaN(parseTickTimestamp('not-a-date'))).toBe(true);
  });
});

describe('compareTickTiming', () => {
  test('marks as on-time when current time is after tick time', () => {
    const result = compareTickTiming(1000, 1032);
    expect(result).toEqual({ differenceMs: 32, isOnTime: true });
  });

  test('marks as on-time when current time equals tick time', () => {
    const result = compareTickTiming(1000, 1000);
    expect(result).toEqual({ differenceMs: 0, isOnTime: true });
  });

  test('marks as not on-time when current time is before tick time', () => {
    const result = compareTickTiming(2000, 1500);
    expect(result).toEqual({ differenceMs: -500, isOnTime: false });
  });
});
