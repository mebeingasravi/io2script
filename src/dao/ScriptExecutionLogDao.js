import { Op } from 'sequelize';
import SuperDao from './SuperDao.js';
import models from '../models/index.js';

class ScriptExecutionLogDao extends SuperDao {
  /**
   * @param {import('sequelize').ModelStatic<any>} [model] - Injectable for tests.
   */
  constructor(model = models.ScriptExecutionLog) {
    super(model);
  }

  /**
   * @param {object} data
   * @returns {Promise<object>} The created log row.
   */
  async createLog(data) {
    return this.create(data);
  }

  /**
   * @param {string} executionId
   * @param {object} data
   * @returns {Promise<number>} Number of affected rows.
   */
  async updateLog(executionId, data) {
    return this.update({ execution_id: executionId }, data);
  }

  /**
   * @param {string} scriptId
   * @param {{ dateFrom?: string, dateTo?: string }} [filters]
   * @returns {Promise<object[]>}
   */
  async findLogsByScript(scriptId, { dateFrom, dateTo } = {}) {
    const where = { script_id: scriptId };

    if (dateFrom || dateTo) {
      where.start_time = {};
      if (dateFrom) where.start_time[Op.gte] = new Date(dateFrom);
      if (dateTo) where.start_time[Op.lte] = new Date(dateTo);
    }

    return this.model.findAll({ where, order: [['start_time', 'DESC']] });
  }
}

export default ScriptExecutionLogDao;
