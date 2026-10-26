import { Router } from 'express';
import {
  getCatalog,
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  addPropertyImages,
  addPropertyRoom,
} from './properties.controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { createReview, getPropertyReviews } from '../reviews/reviews.controller';

const router = Router();

// Public listing & search. Catalog must stay ahead of /:propertyId.
router.get('/catalog', getCatalog);
router.get('/', getProperties);
router.get('/:propertyId', getPropertyById);
router.get('/:propertyId/reviews', getPropertyReviews);
router.post('/:propertyId/reviews', authenticate, createReview);

// Host / Admin protected routes
router.post('/', authenticate, requireRole(['HOST', 'ADMIN']), createProperty);
router.patch('/:propertyId', authenticate, updateProperty);
router.post('/:propertyId/images', authenticate, addPropertyImages);
router.post('/:propertyId/rooms', authenticate, addPropertyRoom);

export default router;
