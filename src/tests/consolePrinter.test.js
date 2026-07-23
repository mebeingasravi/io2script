import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { printTick, printRowError } from '../utils/consolePrinter.js';

describe('printTick', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('prints a checkmark when the tick is on-time', () => {
    printTick({
      tickTimeMs: 1721450901000,
      currentTimeMs: 1721450901032,
      differenceMs: 32,
      isOnTime: true,
      data: { 'Transaction ID': 'TXN100001' },
    });

    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('Tick Time      : 1721450901000');
    expect(output).toContain('Current Time   : 1721450901032');
    expect(output).toContain('Difference(ms) : 32');
    expect(output).toContain('Status         : ✅');
    expect(output).toContain('Transaction ID : TXN100001');
    expect(output).not.toContain('❌');
  });

  test('prints a cross mark when the tick is not on-time', () => {
    printTick({
      tickTimeMs: 2000,
      currentTimeMs: 1500,
      differenceMs: -500,
      isOnTime: false,
      data: {},
    });

    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('Status         : ❌');
    expect(output).not.toContain('✅');
  });
});

describe('printRowError', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('prints the message alone when no cause is given', () => {
    printRowError('Something went wrong');
    expect(errorSpy).toHaveBeenCalledWith('[row-error] Something went wrong');
  });

  test('appends the cause message when provided', () => {
    printRowError('Something went wrong', new Error('root cause'));
    expect(errorSpy).toHaveBeenCalledWith('[row-error] Something went wrong :: root cause');
  });
});
