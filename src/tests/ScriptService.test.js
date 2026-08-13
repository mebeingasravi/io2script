import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { EventEmitter } from 'node:events';

function createFakeChild(pid = 4321) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = pid;
  child.kill = jest.fn();
  return child;
}

let spawnMock;
let lastChild;

jest.unstable_mockModule('node:child_process', () => ({
  spawn: (...args) => spawnMock(...args),
}));

jest.unstable_mockModule('uuid', () => ({
  v4: () => 'generated-script-id',
}));

const { default: ScriptService } = await import('../services/ScriptService.js');
const { default: processRegistry } = await import('../services/processRegistry.js');

function createScriptDaoMock(overrides = {}) {
  return {
    create: jest.fn(async (data) => ({ ...data, get: () => data })),
    findById: jest.fn(),
    findAllPaginated: jest.fn(),
    updateStatus: jest.fn(async () => 1),
    findActiveScripts: jest.fn(async () => []),
    ...overrides,
  };
}

function createLogDaoMock(overrides = {}) {
  return {
    createLog: jest.fn(async (data) => ({ execution_id: 'exec-1', ...data })),
    updateLog: jest.fn(async () => 1),
    findLogsByScript: jest.fn(async () => []),
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ScriptService', () => {
  beforeEach(() => {
    processRegistry.clear();
    lastChild = undefined;
    spawnMock = jest.fn(() => {
      lastChild = createFakeChild();
      return lastChild;
    });
  });

  describe('createScript', () => {
    test('generates a script_id and python_file_path, defaults status to stopped', async () => {
      const scriptDao = createScriptDaoMock();
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.createScript({
        script_name: 'demo',
        strategy_type: 'Nifty',
        description: 'desc',
        react_script: 'x',
      });

      expect(result.statusCode).toBe(201);
      expect(result.response.status).toBe(true);
      expect(result.response.data.script_id).toBe('generated-script-id');
      expect(result.response.data.status).toBe('stopped');
      expect(scriptDao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          script_id: 'generated-script-id',
          python_file_path: expect.stringContaining('generated-script-id.py'),
          status: 'stopped',
        }),
      );
    });
  });

  describe('getScripts', () => {
    test('maps rows and builds pagination metadata', async () => {
      const scriptDao = createScriptDaoMock({
        findAllPaginated: jest.fn(async () => ({
          rows: [
            {
              get: () => ({
                script_id: '1',
                script_name: 'a',
                strategy_type: 'Nifty',
                description: 'd',
                status: 'stopped',
                created_at: 'now',
              }),
            },
          ],
          count: 1,
        })),
      });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.getScripts({ page: 1, limit: 10 });

      expect(result.response.data.scripts).toHaveLength(1);
      expect(result.response.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('restartScript', () => {
    test('returns 404 when the script does not exist', async () => {
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => null) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.restartScript('missing');
      expect(result.statusCode).toBe(404);
    });

    test('spawns the python process and marks the script running', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const logDao = createLogDaoMock();
      const service = new ScriptService(scriptDao, logDao);

      const result = await service.restartScript('s1');

      expect(result.response.message).toBe('Script restarted successfully');
      expect(spawnMock).toHaveBeenCalledWith('python3', ['/tmp/s1.py']);
      expect(scriptDao.updateStatus).toHaveBeenCalledWith('s1', 'running');
      expect(processRegistry.has('s1')).toBe(true);
    });

    test('marks the execution log and script failed when the process exits non-zero', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const logDao = createLogDaoMock();
      const service = new ScriptService(scriptDao, logDao);

      await service.restartScript('s1');
      lastChild.emit('exit', 1, null);
      await flush();

      expect(logDao.updateLog).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: 'failed' }),
      );
      expect(scriptDao.updateStatus).toHaveBeenLastCalledWith('s1', 'failed');
      expect(processRegistry.has('s1')).toBe(false);
    });

    test('marks the execution log success on a zero exit code without changing script status again', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const logDao = createLogDaoMock();
      const service = new ScriptService(scriptDao, logDao);

      await service.restartScript('s1');
      scriptDao.updateStatus.mockClear();
      lastChild.emit('exit', 0, null);
      await flush();

      expect(logDao.updateLog).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: 'success' }),
      );
      expect(scriptDao.updateStatus).not.toHaveBeenCalled();
    });

    test('marks stopped when the process was killed by a signal', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const logDao = createLogDaoMock();
      const service = new ScriptService(scriptDao, logDao);

      await service.restartScript('s1');
      lastChild.emit('exit', null, 'SIGTERM');
      await flush();

      expect(logDao.updateLog).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: 'stopped' }),
      );
      expect(scriptDao.updateStatus).toHaveBeenLastCalledWith('s1', 'stopped');
    });

    test('handles a spawn error (e.g. missing python interpreter) gracefully', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const logDao = createLogDaoMock();
      const service = new ScriptService(scriptDao, logDao);

      await service.restartScript('s1');
      lastChild.emit('error', new Error('spawn python3 ENOENT'));
      await flush();

      expect(logDao.updateLog).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: 'failed', log_message: expect.stringContaining('ENOENT') }),
      );
      expect(scriptDao.updateStatus).toHaveBeenLastCalledWith('s1', 'failed');
      expect(processRegistry.has('s1')).toBe(false);
    });
  });

  describe('stopScript', () => {
    test('returns 404 when the script does not exist', async () => {
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => null) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.stopScript('missing');
      expect(result.statusCode).toBe(404);
    });

    test('kills a tracked process and marks the script stopped', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      await service.restartScript('s1');
      const result = await service.stopScript('s1');

      expect(lastChild.kill).toHaveBeenCalledWith('SIGTERM');
      expect(scriptDao.updateStatus).toHaveBeenLastCalledWith('s1', 'stopped');
      expect(result.response.message).toBe('Script stopped successfully');
      expect(processRegistry.has('s1')).toBe(false);
    });

    test('still marks stopped in the database when no process is tracked', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => script) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.stopScript('s1');

      expect(result.statusCode).toBe(200);
      expect(scriptDao.updateStatus).toHaveBeenCalledWith('s1', 'stopped');
    });
  });

  describe('getLogs', () => {
    test('returns 404 when the script does not exist', async () => {
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => null) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      const result = await service.getLogs('missing', {});
      expect(result.statusCode).toBe(404);
    });

    test('maps logs to the response DTO and forwards date filters', async () => {
      const scriptDao = createScriptDaoMock({ findById: jest.fn(async () => ({ script_id: 's1' })) });
      const logDao = createLogDaoMock({
        findLogsByScript: jest.fn(async () => [
          {
            get: () => ({
              execution_id: 'e1',
              script_id: 's1',
              start_time: 't1',
              end_time: 't2',
              status: 'success',
              log_message: 'ok',
            }),
          },
        ]),
      });
      const service = new ScriptService(scriptDao, logDao);

      const result = await service.getLogs('s1', { date_from: '2026-01-01' });

      expect(logDao.findLogsByScript).toHaveBeenCalledWith('s1', {
        dateFrom: '2026-01-01',
        dateTo: undefined,
      });
      expect(result.response.data).toEqual([
        {
          execution_id: 'e1',
          script_id: 's1',
          start_time: 't1',
          end_time: 't2',
          status: 'success',
          log_message: 'ok',
        },
      ]);
    });
  });

  describe('ensureActiveScriptsRunning', () => {
    test('respawns an active script whose process is not alive', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      const scriptDao = createScriptDaoMock({ findActiveScripts: jest.fn(async () => [script]) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      await service.ensureActiveScriptsRunning();

      expect(spawnMock).toHaveBeenCalledWith('python3', ['/tmp/s1.py']);
      expect(processRegistry.has('s1')).toBe(true);
    });

    test('skips a script whose tracked process is still alive', async () => {
      const script = { script_id: 's1', python_file_path: '/tmp/s1.py' };
      processRegistry.set('s1', { pid: process.pid, child: createFakeChild(process.pid) });

      const scriptDao = createScriptDaoMock({ findActiveScripts: jest.fn(async () => [script]) });
      const service = new ScriptService(scriptDao, createLogDaoMock());

      await service.ensureActiveScriptsRunning();

      expect(spawnMock).not.toHaveBeenCalled();
    });

    test('marks a script failed if respawning throws, without stopping other scripts', async () => {
      const badScript = { script_id: 'bad', python_file_path: '/tmp/bad.py' };
      const goodScript = { script_id: 'good', python_file_path: '/tmp/good.py' };
      const scriptDao = createScriptDaoMock({
        findActiveScripts: jest.fn(async () => [badScript, goodScript]),
      });
      const logDao = createLogDaoMock({
        createLog: jest.fn(async (data) => {
          if (data.script_id === 'bad') throw new Error('db down');
          return { execution_id: 'exec-good', ...data };
        }),
      });
      const service = new ScriptService(scriptDao, logDao);

      await service.ensureActiveScriptsRunning();

      expect(scriptDao.updateStatus).toHaveBeenCalledWith('bad', 'failed');
      expect(spawnMock).toHaveBeenCalledWith('python3', ['/tmp/good.py']);
    });
  });
});
