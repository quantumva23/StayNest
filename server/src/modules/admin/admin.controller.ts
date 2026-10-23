import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const getAdminUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { isActive, role } = z.object({
      isActive: z.boolean().optional(),
      role: z.enum(['GUEST', 'HOST', 'ADMIN']).optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const getAdminProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        host: { select: { id: true, name: true, email: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        rooms: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ properties });
  } catch (error) {
    next(error);
  }
};

export const updatePropertyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;
    const { status } = z.object({
      status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'INACTIVE']),
    }).parse(req.body);

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { status },
      include: {
        host: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ property });
  } catch (error) {
    next(error);
  }
};

export const getAdminBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: {
          include: {
            property: { select: { id: true, name: true, city: true } },
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
