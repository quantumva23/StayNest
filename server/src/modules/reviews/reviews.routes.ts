import { Router } from 'express';
import { createReview, getPropertyReviews, getReviewById } from './reviews.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/property/:propertyId', getPropertyReviews);
router.get('/:reviewId', getReviewById);

export default router;
