import { Sequelize } from 'sequelize';
import config from './index.js';

/**
 * Production Sequelize connection (PostgreSQL). Tests build their own
 * throwaway in-memory SQLite instance instead of importing this module, so
 * the test suite never requires a live database.
 */
const sequelize = new Sequelize(config.db.url, {
  dialect: 'postgres',
  logging: config.db.logging ? (msg) => console.log(msg) : false,
  define: {
    underscored: true,
  },
});

export default sequelize;
