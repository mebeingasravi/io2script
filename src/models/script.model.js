import { DataTypes, Model } from 'sequelize';

/** Allowed values for `Script.strategy_type`. */
export const STRATEGY_TYPES = ['Nifty', 'Bank-nifty', 'Nifty 50', 'Nifty 100', 'Mid nifty'];

/** Allowed values for `Script.status`. */
export const SCRIPT_STATUSES = ['running', 'stopped', 'failed'];

/**
 * Defines the `Script` model (table: `scripts`) against the given Sequelize
 * instance. Passing the instance in (rather than importing a singleton)
 * keeps the model definition reusable across the production Postgres
 * connection and the in-memory SQLite instance used in tests.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {typeof Model}
 */
export default function defineScriptModel(sequelize) {
  class Script extends Model {}

  Script.init(
    {
      script_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      script_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      strategy_type: {
        type: DataTypes.ENUM(...STRATEGY_TYPES),
        allowNull: false,
        validate: { isIn: [STRATEGY_TYPES] },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      react_script: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      python_file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...SCRIPT_STATUSES),
        allowNull: false,
        defaultValue: 'stopped',
        validate: { isIn: [SCRIPT_STATUSES] },
      },
    },
    {
      sequelize,
      modelName: 'Script',
      tableName: 'scripts',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Script;
}
