import { describe, test, expect } from '@jest/globals';
import config from '../config/index.js';

describe('config', () => {
  test('is frozen (immutable) at the top level', () => {
    expect(Object.isFrozen(config)).toBe(true);
  });

  test('exposes the required configuration keys', () => {
    expect(config).toEqual(
      expect.objectContaining({
        port: expect.any(Number),
        inputFile: expect.any(String),
        logPath: expect.any(String),
        nodeEnv: expect.any(String),
        appName: 'io2script',
      }),
    );
  });

  test('csv field mapping targets the sample CSV headers', () => {
    expect(config.csv.timestampField).toBe('Date Time');
    expect(config.csv.transactionIdField).toBe('Transaction ID');
  });
});
