import { describe, test, expect, jest } from '@jest/globals';

const scheduleMock = jest.fn(() => ({ stop: jest.fn() }));

jest.unstable_mockModule('node-cron', () => ({
  default: { schedule: scheduleMock },
  schedule: scheduleMock,
}));

const ensureActiveScriptsRunningMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../services/ScriptService.js', () => ({
  default: jest.fn(() => ({ ensureActiveScriptsRunning: ensureActiveScriptsRunningMock })),
}));

const { startScriptCron } = await import('../cron/scriptCron.js');
const { default: config } = await import('../config/index.js');

describe('startScriptCron', () => {
  test('schedules a job using the configured cron expression', () => {
    startScriptCron();

    expect(scheduleMock).toHaveBeenCalledWith(config.cron.scriptSchedule, expect.any(Function));
  });

  test('the scheduled job delegates to ScriptService.ensureActiveScriptsRunning', async () => {
    startScriptCron();

    const job = scheduleMock.mock.calls[scheduleMock.mock.calls.length - 1][1];
    await job();

    expect(ensureActiveScriptsRunningMock).toHaveBeenCalledTimes(1);
  });

  test('a failing supervision pass does not throw out of the scheduled job', async () => {
    ensureActiveScriptsRunningMock.mockRejectedValueOnce(new Error('db down'));
    startScriptCron();

    const job = scheduleMock.mock.calls[scheduleMock.mock.calls.length - 1][1];
    await expect(job()).resolves.toBeUndefined();
  });
});
