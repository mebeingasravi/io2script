/**
 * Generic CRUD base class every DAO extends. Keeps Sequelize query
 * construction out of services/controllers.
 */
class SuperDao {
  /**
   * @param {import('sequelize').ModelStatic<any>} model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * @param {string} id
   * @param {import('sequelize').FindOptions} [options]
   */
  async findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  /**
   * @param {object} condition
   * @param {import('sequelize').FindOptions} [options]
   */
  async findOne(condition, options = {}) {
    return this.model.findOne({ where: condition, ...options });
  }

  /**
   * @param {object} [condition]
   * @param {import('sequelize').FindOptions} [options]
   */
  async findAll(condition = {}, options = {}) {
    return this.model.findAll({ where: condition, ...options });
  }

  /**
   * @param {object} data
   * @param {import('sequelize').CreateOptions} [options]
   */
  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  /**
   * @param {object} condition
   * @param {object} data
   * @param {import('sequelize').UpdateOptions} [options]
   * @returns {Promise<number>} Number of affected rows.
   */
  async update(condition, data, options = {}) {
    const [affectedCount] = await this.model.update(data, { where: condition, ...options });
    return affectedCount;
  }
}

export default SuperDao;
