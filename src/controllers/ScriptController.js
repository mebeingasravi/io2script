import ScriptService from '../services/ScriptService.js';
import responseHandler from '../helper/responseHandler.js';
import logger from '../config/logger.js';

/**
 * HTTP layer for Python script configuration and process management.
 * Contains no business logic or database access — everything is delegated
 * to `ScriptService`. Exported as a singleton so routes can reference its
 * bound arrow-function methods directly.
 */
class ScriptController {
  constructor() {
    this.scriptService = new ScriptService();
  }

  createScript = async (req, res) => {
    try {
      const result = await this.scriptService.createScript(req.body);
      return res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      return res.status(500).send(responseHandler.error(e.message).response);
    }
  };

  getScripts = async (req, res) => {
    try {
      const result = await this.scriptService.getScripts(req.query);
      return res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      return res.status(500).send(responseHandler.error(e.message).response);
    }
  };

  restartScript = async (req, res) => {
    try {
      const result = await this.scriptService.restartScript(req.params.id);
      return res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      return res.status(500).send(responseHandler.error(e.message).response);
    }
  };

  stopScript = async (req, res) => {
    try {
      const result = await this.scriptService.stopScript(req.params.id);
      return res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      return res.status(500).send(responseHandler.error(e.message).response);
    }
  };

  getLogs = async (req, res) => {
    try {
      const result = await this.scriptService.getLogs(req.params.id, req.query);
      return res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      return res.status(500).send(responseHandler.error(e.message).response);
    }
  };
}

export default new ScriptController();
