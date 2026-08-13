import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { Sequelize } from 'sequelize';
import defineScriptModel from '../models/script.model.js';
import defineScriptExecutionLogModel from '../models/scriptExecutionLog.model.js';
import { associate } from '../models/index.js';
import ScriptDao from '../dao/ScriptDao.js';
import ScriptExecutionLogDao from '../dao/ScriptExecutionLogDao.js';

describe('ScriptExecutionLogDao', () => {
  let sequelize;
  let Script;
  let ScriptExecutionLog;
  let scriptDao;
  let logDao;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    Script = defineScriptModel(sequelize);
    ScriptExecutionLog = defineScriptExecutionLogModel(sequelize);
    associate({ Script, ScriptExecutionLog });
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await ScriptExecutionLog.destroy({ where: {}, truncate: true });
    await Script.destroy({ where: {}, truncate: true });
    scriptDao = new ScriptDao(Script);
    logDao = new ScriptExecutionLogDao(ScriptExecutionLog);

    await scriptDao.create({
      script_id: 'script-1',
      script_name: 'demo',
      strategy_type: 'Nifty',
      description: 'desc',
      react_script: 'console.log(1)',
      python_file_path: '/tmp/demo.py',
      status: 'running',
    });
  });

  test('createLog persists a row linked to its script', async () => {
    const log = await logDao.createLog({
      script_id: 'script-1',
      status: 'running',
      start_time: new Date('2026-01-05T00:00:00Z'),
    });

    expect(log.script_id).toBe('script-1');
    expect(log.status).toBe('running');
  });

  test('updateLog mutates the row by execution_id', async () => {
    const log = await logDao.createLog({
      script_id: 'script-1',
      status: 'running',
      start_time: new Date(),
    });

    const affected = await logDao.updateLog(log.execution_id, {
      status: 'success',
      end_time: new Date(),
      log_message: 'done',
    });

    expect(affected).toBe(1);
    const reloaded = await logDao.findById(log.execution_id);
    expect(reloaded.status).toBe('success');
    expect(reloaded.log_message).toBe('done');
  });

  test('findLogsByScript returns rows newest-first', async () => {
    await logDao.createLog({
      script_id: 'script-1',
      status: 'success',
      start_time: new Date('2026-01-01T00:00:00Z'),
    });
    await logDao.createLog({
      script_id: 'script-1',
      status: 'success',
      start_time: new Date('2026-01-10T00:00:00Z'),
    });

    const logs = await logDao.findLogsByScript('script-1');
    expect(logs).toHaveLength(2);
    expect(new Date(logs[0].start_time).getTime()).toBeGreaterThan(
      new Date(logs[1].start_time).getTime(),
    );
  });

  test('findLogsByScript filters by date_from/date_to', async () => {
    await logDao.createLog({
      script_id: 'script-1',
      status: 'success',
      start_time: new Date('2026-01-01T00:00:00Z'),
    });
    await logDao.createLog({
      script_id: 'script-1',
      status: 'success',
      start_time: new Date('2026-01-15T00:00:00Z'),
    });
    await logDao.createLog({
      script_id: 'script-1',
      status: 'success',
      start_time: new Date('2026-02-01T00:00:00Z'),
    });

    const logs = await logDao.findLogsByScript('script-1', {
      dateFrom: '2026-01-05',
      dateTo: '2026-01-31',
    });

    expect(logs).toHaveLength(1);
  });

  test('a log can be fetched through its script association', async () => {
    await logDao.createLog({ script_id: 'script-1', status: 'success', start_time: new Date() });

    const script = await scriptDao.findById('script-1', {
      include: [{ association: 'executionLogs' }],
    });

    expect(script.executionLogs).toHaveLength(1);
  });
});
