import SuperDao from './SuperDao.js';
import models from '../models/index.js';

class ScriptDao extends SuperDao {
  /**
   * @param {import('sequelize').ModelStatic<any>} [model] - Injectable for tests.
   */
  constructor(model = models.Script) {
    super(model);
  }

  /**
   * @param {{ page?: number, limit?: number }} pagination
   * @returns {Promise<{ rows: object[], count: number }>}
   */
  async findAllPaginated({ page = 1, limit = 10 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);

    return this.model.findAndCountAll({
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * @param {string} scriptId
   * @param {'running'|'stopped'|'failed'} status
   * @returns {Promise<number>} Number of affected rows.
   */
  async updateStatus(scriptId, status) {
    return this.update({ script_id: scriptId }, { status });
  }

  /**
   * @returns {Promise<object[]>} All scripts currently marked as running.
   */
  async findActiveScripts() {
    return this.findAll({ status: 'running' });
  }
}

export default ScriptDao;
