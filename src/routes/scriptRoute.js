import { Router } from 'express';
import auth from '../middlewares/auth.js';
import adminAuth from '../middlewares/adminAuth.js';
import ScriptController from '../controllers/ScriptController.js';
import {
  createScriptValidator,
  paginationValidator,
  logsQueryValidator,
  idParamValidator,
} from '../validator/scriptValidator.js';

const router = Router();

router.use(auth(), adminAuth);

router.post('/', createScriptValidator, ScriptController.createScript);

router.get('/', paginationValidator, ScriptController.getScripts);

router.post('/:id/restart', idParamValidator, ScriptController.restartScript);

router.post('/:id/stop', idParamValidator, ScriptController.stopScript);

router.get('/:id/logs', idParamValidator, logsQueryValidator, ScriptController.getLogs);

export default router;
