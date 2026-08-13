import { Router } from 'express';
import scriptRoute from './scriptRoute.js';

const router = Router();

router.use('/scripts', scriptRoute);

export default router;
