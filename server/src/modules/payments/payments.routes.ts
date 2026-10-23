import { Router } from 'express';
import {
  createCheckoutOrder,
  verifyPayment,
  handlePaymentWebhook,
} from './payments.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/checkout', authenticate, createCheckoutOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/webhook', handlePaymentWebhook);

export default router;
