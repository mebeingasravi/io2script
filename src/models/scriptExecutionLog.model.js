import { DataTypes, Model } from 'sequelize';

/** Allowed values for `ScriptExecutionLog.status`. */
export const EXECUTION_STATUSES = ['success', 'failed', 'running', 'stopped'];

/**
 * Defines the `ScriptExecutionLog` model (table: `script_execution_logs`)
 * against the given Sequelize instance. See {@link defineScriptModel} for
 * why the instance is passed in rather than imported as a singleton.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {typeof Model}
 */
export default function defineScriptExecutionLogModel(sequelize) {
  class ScriptExecutionLog extends Model {}

  ScriptExecutionLog.init(
    {
      execution_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      script_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      process_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...EXECUTION_STATUSES),
        allowNull: false,
        defaultValue: 'running',
        validate: { isIn: [EXECUTION_STATUSES] },
      },
      log_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ScriptExecutionLog',
      tableName: 'script_execution_logs',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return ScriptExecutionLog;
}
