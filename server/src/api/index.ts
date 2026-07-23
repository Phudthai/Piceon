import { Router, type IRouter } from 'express';
import authRoutes from './routes/auth.routes';
import characterRoutes from './routes/character.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/characters', characterRoutes);

export default router;
