import { describe, test, expect } from '@jest/globals';
import { buildTickResult, toLogEntry } from '../services/tickProcessor.service.js';

const baseRow = {
  'Transaction ID': 'TXN100001',
  'Date Time': 'Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)',
  Action: 'BUY',
};

describe('buildTickResult', () => {
  test('flags a tick as on-time when now is after the tick timestamp', () => {
    const tickTimeMs = new Date(baseRow['Date Time']).getTime();
    const result = buildTickResult(baseRow, tickTimeMs + 32);

    expect(result.tickTimeMs).toBe(tickTimeMs);
    expect(result.currentTimeMs).toBe(tickTimeMs + 32);
    expect(result.differenceMs).toBe(32);
    expect(result.isOnTime).toBe(true);
    expect(result.data).toBe(baseRow);
  });

  test('flags a tick as not on-time when now is before the tick timestamp', () => {
    const tickTimeMs = new Date(baseRow['Date Time']).getTime();
    const result = buildTickResult(baseRow, tickTimeMs - 10);

    expect(result.isOnTime).toBe(false);
    expect(result.differenceMs).toBe(-10);
  });

  test('throws on a missing timestamp field', () => {
    expect(() => buildTickResult({ 'Transaction ID': 'TXN1' })).toThrow(/Invalid timestamp/);
  });

  test('throws on an unparsable timestamp value', () => {
    expect(() => buildTickResult({ 'Date Time': 'garbage' })).toThrow(/Invalid timestamp/);
  });
});

describe('toLogEntry', () => {
  test('shapes a JSON log entry from a tick result', () => {
    const tickResult = {
      tickTimeMs: 1721450901000,
      currentTimeMs: 1721450901032,
      differenceMs: 32,
      isOnTime: true,
      data: baseRow,
    };

    expect(toLogEntry(tickResult)).toEqual({
      timestamp: new Date(1721450901000).toISOString(),
      currentTime: new Date(1721450901032).toISOString(),
      difference: 32,
      status: 'success',
      data: baseRow,
    });
  });

  test('marks status as failed when the tick was not on-time', () => {
    const tickResult = {
      tickTimeMs: 2000,
      currentTimeMs: 1500,
      differenceMs: -500,
      isOnTime: false,
      data: baseRow,
    };

    expect(toLogEntry(tickResult).status).toBe('failed');
  });
});
