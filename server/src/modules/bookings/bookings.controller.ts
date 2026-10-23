import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

const quoteSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string(),
  checkOut: z.string(),
  quantity: z.number().int().min(1).default(1),
  guestsCount: z.number().int().min(1).default(1),
});

export const calculateQuote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId, checkIn, checkOut, quantity, guestsCount } = quoteSchema.parse(req.body);

    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);

    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      return next(new AppError('Invalid date format.', 400, 'INVALID_DATE'));
    }

    if (parsedCheckOut <= parsedCheckIn) {
      return next(new AppError('Check-out date must be strictly after check-in date.', 400, 'INVALID_DATE_RANGE'));
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true },
    });

    if (!room || !room.isActive) {
      return next(new AppError('Selected room is unavailable or not found.', 404, 'ROOM_NOT_FOUND'));
    }

    if (guestsCount > room.capacity * quantity) {
      return next(
        new AppError(
          `Guest count (${guestsCount}) exceeds maximum capacity of ${room.capacity * quantity} for ${quantity} room(s).`,
          400,
          'CAPACITY_EXCEEDED'
        )
      );
    }

    const diffDays = Math.round((parsedCheckOut.getTime() - parsedCheckIn.getTime()) / (1000 * 60 * 60 * 24));
    const nights = Math.max(1, diffDays);

    const unitPriceSnapshot = room.pricePerNight; // minor units (paise)
    const subtotal = unitPriceSnapshot * nights * quantity;
    const fees = Math.round(subtotal * 0.10); // 10% platform fee
    const totalAmount = subtotal + fees;

    // Check availability for these dates
    const now = new Date();
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomId,
        checkIn: { lt: parsedCheckOut },
        checkOut: { gt: parsedCheckIn },
        OR: [
          { status: 'CONFIRMED' },
          {
            status: 'PENDING_PAYMENT',
            expiresAt: { gt: now },
          },
        ],
      },
      select: { quantity: true },
    });

    const bookedUnits = overlappingBookings.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0);
    const availableUnits = room.totalUnits - bookedUnits;
    const isAvailable = availableUnits >= quantity;

    return res.status(200).json({
      quote: {
        roomId: room.id,
        roomName: room.name,
        propertyName: room.property.name,
        nights,
        quantity,
        guestsCount,
        unitPriceSnapshot,
        subtotal,
        fees,
        totalAmount,
        currency: room.currency,
        isAvailable,
        availableUnits: Math.max(0, availableUnits),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createBookingSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string(),
  checkOut: z.string(),
  quantity: z.number().int().min(1).default(1),
  guestsCount: z.number().int().min(1),
});

export const createBookingHold = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { roomId, checkIn, checkOut, quantity, guestsCount } = createBookingHoldValidation(req.body);

    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);

    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      return next(new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE'));
    }

    if (parsedCheckOut <= parsedCheckIn) {
      return next(new AppError('Check-out date must be strictly after check-in date.', 400, 'INVALID_DATE_RANGE'));
    }

    // Booking transaction with concurrency-safe inventory allocation
    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { property: true },
      });

      if (!room || !room.isActive) {
        throw new AppError('Room not found or no longer active.', 404, 'ROOM_NOT_FOUND');
      }

      if (guestsCount > room.capacity * quantity) {
        throw new AppError(
          `Guest count exceeds room capacity of ${room.capacity * quantity}.`,
          400,
          'CAPACITY_EXCEEDED'
        );
      }

      const now = new Date();

      // Find overlapping confirmed bookings and active pending holds
      const overlappingBookings = await tx.booking.findMany({
        where: {
          roomId,
          checkIn: { lt: parsedCheckOut },
          checkOut: { gt: parsedCheckIn },
          OR: [
            { status: 'CONFIRMED' },
            {
              status: 'PENDING_PAYMENT',
              expiresAt: { gt: now },
            },
          ],
        },
        select: { quantity: true },
      });

      const bookedUnits = overlappingBookings.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0);

      if (bookedUnits + quantity > room.totalUnits) {
        throw new AppError(
          'The selected dates are no longer available for the requested quantity.',
          409,
          'BOOKING_CONFLICT'
        );
      }

      const diffDays = Math.round((parsedCheckOut.getTime() - parsedCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      const nights = Math.max(1, diffDays);

      const unitPriceSnapshot = room.pricePerNight;
      const subtotal = unitPriceSnapshot * nights * quantity;
      const fees = Math.round(subtotal * 0.10);
      const totalAmount = subtotal + fees;

      const expiresAt = new Date(Date.now() + env.HOLD_DURATION_MINUTES * 60 * 1000);

      const newBooking = await tx.booking.create({
        data: {
          guestId: req.user!.id,
          roomId: room.id,
          checkIn: parsedCheckIn,
          checkOut: parsedCheckOut,
          guestsCount,
          quantity,
          status: 'PENDING_PAYMENT',
          unitPriceSnapshot,
          subtotal,
          fees,
          totalAmount,
          currency: room.currency,
          expiresAt,
        },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      return newBooking;
    });

    return res.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
};

function createBookingHoldValidation(body: unknown) {
  return createBookingSchema.parse(body);
}

export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const bookings = await prisma.booking.findMany({
      where: { guestId: req.user.id },
      include: {
        room: {
          include: {
            property: {
              include: {
                images: { take: 1, orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            property: {
              include: {
                images: true,
                host: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        payments: true,
        guest: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return next(new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND'));
    }

    // Authorization: guest owner, host of property, or admin
    const isGuest = booking.guestId === req.user.id;
    const isHost = booking.room.property.hostId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isGuest && !isHost && !isAdmin) {
      return next(new AppError('Forbidden. You do not have permission to view this reservation.', 403, 'FORBIDDEN'));
    }

    return res.status(200).json({ booking });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { property: true } },
      },
    });

    if (!booking) {
      return next(new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND'));
    }

    const isGuest = booking.guestId === req.user.id;
    const isHost = booking.room.property.hostId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isGuest && !isHost && !isAdmin) {
      return next(new AppError('Forbidden. Ownership required to cancel booking.', 403, 'FORBIDDEN'));
    }

    if (booking.status === 'CANCELLED') {
      return next(new AppError('Booking is already cancelled.', 400, 'ALREADY_CANCELLED'));
    }

    if (booking.status === 'EXPIRED') {
      return next(new AppError('Booking hold has expired.', 400, 'HOLD_EXPIRED'));
    }

    // Cancellation policy: check-in date must be in future
    const now = new Date();
    if (booking.checkIn <= now && req.user.role !== 'ADMIN') {
      return next(new AppError('Cannot cancel a reservation on or after check-in date.', 400, 'CANCELLATION_DEADLINE_PASSED'));
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
      },
    });

    return res.status(200).json({
      message: 'Booking successfully cancelled.',
      booking: updated,
    });
  } catch (error) {
    next(error);
  }
};
