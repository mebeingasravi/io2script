import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const writeLogEntryMock = jest.fn();

jest.unstable_mockModule('../logger/index.js', () => ({
  writeLogEntry: writeLogEntryMock,
  closeLogger: jest.fn(() => Promise.resolve()),
}));

const { processTickFile } = await import('../controllers/tick.controller.js');

describe('processTickFile', () => {
  let logSpy;
  let errorSpy;
  let tempFile;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    writeLogEntryMock.mockClear();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    if (tempFile) fs.rmSync(tempFile, { force: true });
    tempFile = undefined;
  });

  test('processes every valid row, printing and logging each tick', async () => {
    tempFile = path.join(os.tmpdir(), `io2script-controller-${Date.now()}.csv`);
    fs.writeFileSync(
      tempFile,
      'Transaction ID,Date Time\nTXN1,"Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)"\n',
    );

    const result = await processTickFile(tempFile);

    expect(result.rowCount).toBe(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(writeLogEntryMock).toHaveBeenCalledTimes(1);
    expect(writeLogEntryMock.mock.calls[0][0].status).toBe('success');
  });

  test('reports a row with an invalid timestamp as an error without stopping the stream', async () => {
    tempFile = path.join(os.tmpdir(), `io2script-controller-bad-${Date.now()}.csv`);
    fs.writeFileSync(
      tempFile,
      'Transaction ID,Date Time\nTXN1,garbage\nTXN2,"Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)"\n',
    );

    const result = await processTickFile(tempFile);

    expect(result.rowCount).toBe(2);
    expect(writeLogEntryMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Line 2'));
  });

  test('rejects when the input file is missing', async () => {
    await expect(processTickFile('/nonexistent/file.csv')).rejects.toThrow(
      /Input CSV file not found/,
    );
  });
});
