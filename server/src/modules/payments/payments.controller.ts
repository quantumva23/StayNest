import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { paymentProvider } from '../../integrations/paymentProvider';
import { AppError } from '../../middleware/errorHandler';

const checkoutSchema = z.object({
  bookingId: z.string().uuid(),
});

export const createCheckoutOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { bookingId } = checkoutSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { property: true } },
      },
    });

    if (!booking) {
      return next(new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND'));
    }

    if (booking.guestId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Forbidden. You do not own this booking.', 403, 'FORBIDDEN'));
    }

    if (booking.status === 'CONFIRMED') {
      return next(new AppError('This booking is already confirmed and paid.', 400, 'ALREADY_PAID'));
    }

    if (booking.status === 'CANCELLED') {
      return next(new AppError('This booking has been cancelled.', 400, 'BOOKING_CANCELLED'));
    }

    const now = new Date();
    if (booking.status === 'EXPIRED' || (booking.expiresAt && booking.expiresAt < now)) {
      return next(new AppError('Booking hold has expired. Please select your dates again.', 400, 'HOLD_EXPIRED'));
    }

    // Call payment provider using server-calculated amount only!
    const order = await paymentProvider.createOrder({
      amount: booking.totalAmount, // minor units (paise)
      currency: booking.currency,
      receipt: `b_${booking.id.substring(0, 8)}`,
      notes: {
        bookingId: booking.id,
        guestId: booking.guestId,
      },
    });

    // Save payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'razorpay',
        providerOrderId: order.orderId,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
    });

    return res.status(200).json({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      bookingId: booking.id,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  providerOrderId: z.string(),
  providerPaymentId: z.string(),
  signature: z.string(),
});

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { bookingId, providerOrderId, providerPaymentId, signature } = verifyPaymentSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return next(new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND'));
    }

    if (booking.guestId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Forbidden. You do not own this booking.', 403, 'FORBIDDEN'));
    }

    // Verify cryptographic signature
    const isValid = paymentProvider.verifyPaymentSignature(providerOrderId, providerPaymentId, signature);
    if (!isValid) {
      return next(new AppError('Payment signature verification failed.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    // Atomically mark payment and booking as confirmed in a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.updateMany({
        where: {
          bookingId,
          providerOrderId,
        },
        data: {
          providerPaymentId,
          status: 'SUCCEEDED',
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          expiresAt: null, // confirmed bookings do not expire
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed.',
      bookingId,
      status: 'CONFIRMED',
    });
  } catch (error) {
    next(error);
  }
};

export const handlePaymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature mismatch' } });
    }

    const payload = req.body;
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.captured';

    // Idempotency: Check if already processed
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: 'razorpay',
          providerEventId: eventId,
        },
      },
    });

    if (existingEvent) {
      // Return 200 OK without re-processing
      return res.status(200).json({ received: true, deduplicated: true });
    }

    // Save event
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'razorpay',
        providerEventId: eventId,
        eventType,
        processingStatus: 'RECEIVED',
      },
    });

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const payment = await tx.payment.findFirst({
            where: { providerOrderId: orderId },
          });

          if (payment) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                providerPaymentId: paymentId || payment.providerPaymentId,
                status: 'SUCCEEDED',
              },
            });

            await tx.booking.update({
              where: { id: payment.bookingId },
              data: {
                status: 'CONFIRMED',
                expiresAt: null,
              },
            });
          }
        });
      }
    }

    await prisma.paymentWebhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: 'razorpay',
          providerEventId: eventId,
        },
      },
      data: {
        processingStatus: 'SUCCESS',
        processedAt: new Date(),
      },
    });

    return res.status(200).json({ received: true, status: 'SUCCESS' });
  } catch (error) {
    next(error);
  }
};
