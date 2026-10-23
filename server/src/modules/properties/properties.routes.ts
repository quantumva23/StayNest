import { Router } from 'express';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  addPropertyImages,
  addPropertyRoom,
} from './properties.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Public listing & search
router.get('/', getProperties);
router.get('/:propertyId', getPropertyById);

// Host / Admin protected routes
router.post('/', authenticate, requireRole(['HOST', 'ADMIN']), createProperty);
router.patch('/:propertyId', authenticate, updateProperty);
router.post('/:propertyId/images', authenticate, addPropertyImages);
router.post('/:propertyId/rooms', authenticate, addPropertyRoom);

export default router;
