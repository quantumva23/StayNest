import { Router } from 'express';
import { updateRoom, getRoomAvailability } from './rooms.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/:roomId/availability', getRoomAvailability);
router.patch('/:roomId', authenticate, updateRoom);

export default router;
