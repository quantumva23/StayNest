import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, transactionOptions } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { overlappingStayWhere } from '../bookings/availability';
import { refreshPropertySearchSnapshot } from '../properties/searchSnapshot';
import { ROOM_TYPES, rupeesToPaise } from '../properties/search';

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true },
    });

    if (!room) {
      return next(new AppError('Room not found.', 404, 'ROOM_NOT_FOUND'));
    }

    if (req.user.role !== 'ADMIN' && room.property.hostId !== req.user.id) {
      return next(new AppError('Forbidden. Ownership required.', 403, 'FORBIDDEN'));
    }

    const updateSchema = z.object({
      name: z.string().min(2, 'Room name must be at least 2 characters').optional(),
      description: z.string().optional(),
      roomType: z.enum(ROOM_TYPES).optional(),
      capacity: z.number().int().min(1, 'Capacity must be at least 1 guest').optional(),
      nightlyPrice: z.number().int().min(100, 'Nightly price must be at least ₹100').optional(),
      totalUnits: z.number().int().min(1, 'Add at least 1 room unit').optional(),
      isActive: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.room.update({
        where: { id: roomId },
        data: {
          name: data.name,
          description: data.description,
          roomType: data.roomType,
          capacity: data.capacity,
          totalUnits: data.totalUnits,
          isActive: data.isActive,
          ...(data.nightlyPrice !== undefined
            ? { pricePerNight: rupeesToPaise(data.nightlyPrice) }
            : {}),
        },
      });
      await refreshPropertySearchSnapshot(tx, room.propertyId);
      return saved;
    }, transactionOptions);

    return res.status(200).json({ room: updated });
  } catch (error) {
    next(error);
  }
};

export const getRoomAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return next(new AppError('Both checkIn and checkOut query params are required.', 400, 'MISSING_DATES'));
    }

    const parsedCheckIn = new Date(String(checkIn));
    const parsedCheckOut = new Date(String(checkOut));

    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      return next(new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE'));
    }

    if (parsedCheckOut <= parsedCheckIn) {
      return next(new AppError('Check-out date must be strictly after check-in date.', 400, 'INVALID_DATE_RANGE'));
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return next(new AppError('Room not found.', 404, 'ROOM_NOT_FOUND'));
    }

    const now = new Date();

    // Check overlap: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
    const overlappingBookings = await prisma.booking.findMany({
      where: overlappingStayWhere(roomId, parsedCheckIn, parsedCheckOut, now),
      select: { quantity: true },
    });

    const bookedUnits = overlappingBookings.reduce((sum, b) => sum + b.quantity, 0);
    const availableUnits = Math.max(0, room.totalUnits - bookedUnits);

    return res.status(200).json({
      roomId: room.id,
      roomName: room.name,
      totalUnits: room.totalUnits,
      bookedUnits,
      availableUnits,
      isAvailable: availableUnits > 0,
      pricePerNight: room.pricePerNight,
      currency: room.currency,
    });
  } catch (error) {
    next(error);
  }
};
