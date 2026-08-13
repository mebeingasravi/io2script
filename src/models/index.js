import { Sequelize } from 'sequelize';
import sequelize from '../config/db.js';
import defineScriptModel from './script.model.js';
import defineScriptExecutionLogModel from './scriptExecutionLog.model.js';

/**
 * Wires the `Script` <-> `ScriptExecutionLog` associations onto already
 * `init`-ed models. Exported separately so tests can reuse the exact same
 * association wiring against a throwaway SQLite instance.
 *
 * @param {{ Script: typeof import('sequelize').Model, ScriptExecutionLog: typeof import('sequelize').Model }} models
 */
export function associate({ Script, ScriptExecutionLog }) {
  Script.hasMany(ScriptExecutionLog, { foreignKey: 'script_id', as: 'executionLogs' });
  ScriptExecutionLog.belongsTo(Script, { foreignKey: 'script_id', as: 'script' });
}

const Script = defineScriptModel(sequelize);
const ScriptExecutionLog = defineScriptExecutionLogModel(sequelize);

associate({ Script, ScriptExecutionLog });

const models = { sequelize, Sequelize, Script, ScriptExecutionLog };

export default models;
