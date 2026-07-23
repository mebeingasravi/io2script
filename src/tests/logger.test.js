import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('logger', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'io2script-logs-'));
    process.env.LOG_PATH = tempDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.LOG_PATH;
    jest.resetModules();
  });

  test("appends newline-delimited JSON entries to today's log file", async () => {
    jest.resetModules();
    const { writeLogEntry, closeLogger } = await import('../logger/index.js');

    writeLogEntry({ timestamp: 'a', currentTime: 'b', difference: 1, status: 'success', data: {} });
    writeLogEntry({ timestamp: 'c', currentTime: 'd', difference: 2, status: 'failed', data: {} });
    await closeLogger();

    const dateKey = new Date().toISOString().slice(0, 10);
    const filePath = path.join(tempDir, `app-${dateKey}.json`);
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({
      timestamp: 'a',
      currentTime: 'b',
      difference: 1,
      status: 'success',
      data: {},
    });
    expect(JSON.parse(lines[1]).status).toBe('failed');
  });

  test('creates the log directory if it does not already exist', async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.resetModules();
    const { writeLogEntry, closeLogger } = await import('../logger/index.js');

    writeLogEntry({ timestamp: 'a', currentTime: 'b', difference: 1, status: 'success', data: {} });
    await closeLogger();

    expect(fs.existsSync(tempDir)).toBe(true);
  });

  test('closeLogger resolves cleanly even if nothing was ever written', async () => {
    jest.resetModules();
    const { closeLogger } = await import('../logger/index.js');
    await expect(closeLogger()).resolves.toBeUndefined();
  });
});
