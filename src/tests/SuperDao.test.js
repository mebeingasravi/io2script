import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';
import SuperDao from '../dao/SuperDao.js';

describe('SuperDao', () => {
  let sequelize;
  let Widget;
  let dao;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    Widget = sequelize.define('Widget', {
      name: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, defaultValue: 'active' },
    });
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Widget.destroy({ where: {}, truncate: true });
    dao = new SuperDao(Widget);
  });

  test('create persists a row and returns the instance', async () => {
    const widget = await dao.create({ name: 'foo' });
    expect(widget.name).toBe('foo');
    expect(widget.status).toBe('active');
  });

  test('findById returns the created row', async () => {
    const created = await dao.create({ name: 'foo' });
    const found = await dao.findById(created.id);
    expect(found.name).toBe('foo');
  });

  test('findById returns null for a missing id', async () => {
    expect(await dao.findById(999999)).toBeNull();
  });

  test('findOne matches by condition', async () => {
    await dao.create({ name: 'foo', status: 'archived' });
    const found = await dao.findOne({ status: 'archived' });
    expect(found.name).toBe('foo');
  });

  test('findAll returns every matching row', async () => {
    await dao.create({ name: 'a' });
    await dao.create({ name: 'b' });
    const rows = await dao.findAll();
    expect(rows).toHaveLength(2);
  });

  test('update mutates matching rows and returns the affected count', async () => {
    const widget = await dao.create({ name: 'foo' });
    const affected = await dao.update({ id: widget.id }, { status: 'archived' });
    expect(affected).toBe(1);

    const reloaded = await dao.findById(widget.id);
    expect(reloaded.status).toBe('archived');
  });

  test('update returns 0 when nothing matches', async () => {
    const affected = await dao.update({ id: 999999 }, { status: 'archived' });
    expect(affected).toBe(0);
  });
});
