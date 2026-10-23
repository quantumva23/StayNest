import { Router } from 'express';
import {
  calculateQuote,
  createBookingHold,
  getMyBookings,
  getBookingById,
  cancelBooking,
} from './bookings.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Quote calculation
router.post('/quote', calculateQuote);

// Booking creation & management
router.post('/', authenticate, createBookingHold);
router.get('/me', authenticate, getMyBookings);
router.get('/:bookingId', authenticate, getBookingById);
router.post('/:bookingId/cancel', authenticate, cancelBooking);

export default router;
