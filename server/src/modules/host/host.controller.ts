import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const getHostProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const properties = await prisma.property.findMany({
      where: { hostId: req.user.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        rooms: true,
        amenities: { include: { amenity: true } },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ properties });
  } catch (error) {
    next(error);
  }
};

export const getHostBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const bookings = await prisma.booking.findMany({
      where: {
        room: {
          property: {
            hostId: req.user.id,
          },
        },
      },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: {
          include: {
            property: true,
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
