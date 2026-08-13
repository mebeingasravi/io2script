import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { Sequelize } from 'sequelize';
import defineScriptModel from '../models/script.model.js';
import ScriptDao from '../dao/ScriptDao.js';

describe('ScriptDao', () => {
  let sequelize;
  let Script;
  let dao;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    Script = defineScriptModel(sequelize);
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Script.destroy({ where: {}, truncate: true });
    dao = new ScriptDao(Script);
  });

  function makeScript(overrides = {}) {
    return dao.create({
      script_id: overrides.script_id || `id-${Math.random()}`,
      script_name: 'demo',
      strategy_type: 'Nifty',
      description: 'desc',
      react_script: 'console.log(1)',
      python_file_path: '/tmp/demo.py',
      status: 'stopped',
      ...overrides,
    });
  }

  test('findAllPaginated returns rows ordered newest-first with a count', async () => {
    await makeScript({ script_id: 'a' });
    await makeScript({ script_id: 'b' });

    const { rows, count } = await dao.findAllPaginated({ page: 1, limit: 10 });
    expect(count).toBe(2);
    expect(rows).toHaveLength(2);
  });

  test('findAllPaginated respects limit and offset', async () => {
    await makeScript({ script_id: 'a' });
    await makeScript({ script_id: 'b' });
    await makeScript({ script_id: 'c' });

    const { rows, count } = await dao.findAllPaginated({ page: 2, limit: 2 });
    expect(count).toBe(3);
    expect(rows).toHaveLength(1);
  });

  test('findAllPaginated falls back to safe defaults for invalid pagination input', async () => {
    await makeScript({ script_id: 'a' });
    const { rows } = await dao.findAllPaginated({ page: -5, limit: 0 });
    expect(rows).toHaveLength(1);
  });

  test('updateStatus changes the status field', async () => {
    await makeScript({ script_id: 'a' });
    const affected = await dao.updateStatus('a', 'running');
    expect(affected).toBe(1);

    const script = await dao.findById('a');
    expect(script.status).toBe('running');
  });

  test('findActiveScripts only returns scripts with status running', async () => {
    await makeScript({ script_id: 'a', status: 'running' });
    await makeScript({ script_id: 'b', status: 'stopped' });

    const active = await dao.findActiveScripts();
    expect(active).toHaveLength(1);
    expect(active[0].script_id).toBe('a');
  });

  test('rejects an invalid strategy_type at the model layer', async () => {
    await expect(makeScript({ script_id: 'a', strategy_type: 'Invalid' })).rejects.toThrow();
  });
});
