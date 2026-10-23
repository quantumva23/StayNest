import { Router } from 'express';
import {
  getAdminUsers,
  updateUserStatus,
  getAdminProperties,
  updatePropertyStatus,
  getAdminBookings,
} from './admin.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN']));

router.get('/users', getAdminUsers);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/properties', getAdminProperties);
router.patch('/properties/:propertyId/status', updatePropertyStatus);
router.get('/bookings', getAdminBookings);

export default router;
