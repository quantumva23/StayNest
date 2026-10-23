import { Router } from 'express';
import { getHostProperties, getHostBookings } from './host.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['HOST', 'ADMIN']));

router.get('/properties', getHostProperties);
router.get('/bookings', getHostBookings);

export default router;
