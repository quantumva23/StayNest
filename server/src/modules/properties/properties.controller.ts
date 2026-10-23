import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { Prisma, PropertyStatus, PropertyType } from '@prisma/client';

type PropertyWithDetails = Prisma.PropertyGetPayload<{
  include: {
    images: true;
    rooms: {
      select: {
        id: true;
        name: true;
        capacity: true;
        pricePerNight: true;
        currency: true;
        totalUnits: true;
      };
    };
    amenities: {
      include: {
        amenity: true;
      };
    };
  };
}>;

const listPropertiesSchema = z.object({
  city: z.string().optional(),
  type: z.enum(['HOTEL', 'LOUNGE', 'GUEST_HOUSE']).optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  amenities: z.string().optional(), // comma-separated amenity names or IDs
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
});

export const getProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listPropertiesSchema.parse(req.query);
    const { city, type, checkIn, checkOut, guests, minPrice, maxPrice, amenities, page, limit } = query;

    const roomWhere: Prisma.RoomWhereInput = {
      isActive: true,
    };
    if (guests) {
      roomWhere.capacity = { gte: guests };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      roomWhere.pricePerNight = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
    };

    if (city) {
      where.city = { contains: city.trim(), mode: 'insensitive' };
    }

    if (type) {
      where.type = type;
    }

    if (amenities) {
      const amenityList = amenities.split(',').map((a) => a.trim()).filter(Boolean);
      if (amenityList.length > 0) {
        where.amenities = {
          some: {
            amenity: {
              name: { in: amenityList, mode: 'insensitive' },
            },
          },
        };
      }
    }

    where.rooms = {
      some: roomWhere,
    };

    const skip = (page - 1) * limit;

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 5,
          },
          rooms: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              capacity: true,
              pricePerNight: true,
              currency: true,
              totalUnits: true,
            },
            orderBy: { pricePerNight: 'asc' },
          },
          amenities: {
            include: {
              amenity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // If checkIn and checkOut are provided, check date-range availability for each property
    let parsedCheckIn: Date | null = null;
    let parsedCheckOut: Date | null = null;
    if (checkIn && checkOut) {
      parsedCheckIn = new Date(checkIn);
      parsedCheckOut = new Date(checkOut);

      if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
        return next(new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE'));
      }
      if (parsedCheckOut <= parsedCheckIn) {
        return next(new AppError('Check-out date must be strictly after check-in date.', 400, 'INVALID_DATE_RANGE'));
      }
    }

    let results = properties.map((prop: PropertyWithDetails) => {
      const minRoomPrice = prop.rooms.length > 0
        ? Math.min(...prop.rooms.map((r) => r.pricePerNight))
        : 0;

      return {
        id: prop.id,
        name: prop.name,
        description: prop.description,
        type: prop.type,
        address: prop.address,
        city: prop.city,
        state: prop.state,
        country: prop.country,
        status: prop.status,
        images: prop.images,
        amenities: prop.amenities.map((pa) => pa.amenity),
        minPricePerNight: minRoomPrice,
        currency: prop.rooms[0]?.currency || 'INR',
        roomCount: prop.rooms.length,
        rooms: prop.rooms,
      };
    });

    // If date filters applied, filter out properties with no available rooms for the dates
    if (parsedCheckIn && parsedCheckOut) {
      const now = new Date();
      const filteredResults = [];

      for (const prop of results) {
        let hasAvailableRoom = false;
        for (const room of prop.rooms) {
          // Count active overlapping bookings
          const overlappingBookings = await prisma.booking.findMany({
            where: {
              roomId: room.id,
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

          const bookedUnits = overlappingBookings.reduce((sum: number, b) => sum + b.quantity, 0);
          const availableUnits = room.totalUnits - bookedUnits;
          if (availableUnits > 0 && (!guests || room.capacity >= guests)) {
            hasAvailableRoom = true;
            break;
          }
        }

        if (hasAvailableRoom) {
          filteredResults.push(prop);
        }
      }
      results = filteredResults;
    }

    return res.status(200).json({
      properties: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        rooms: {
          where: { isActive: true },
          orderBy: { pricePerNight: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!property) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    // If property is not ACTIVE, only host or admin can view
    if (property.status !== 'ACTIVE') {
      if (!req.user || (req.user.role !== 'ADMIN' && req.user.id !== property.hostId)) {
        return next(new AppError('Property listing is currently not public.', 404, 'PROPERTY_NOT_FOUND'));
      }
    }

    return res.status(200).json({
      property: {
        ...property,
        amenities: property.amenities.map((pa) => pa.amenity),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPropertySchema = z.object({
  name: z.string().min(3).max(150),
  description: z.string().min(10),
  type: z.enum(['HOTEL', 'LOUNGE', 'GUEST_HOUSE']),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().default('India'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  amenityIds: z.array(z.string()).optional(),
  images: z.array(z.object({
    imageUrl: z.string().url(),
    altText: z.string().optional(),
    sortOrder: z.number().default(0),
  })).optional(),
});

export const createProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const data = createPropertySchema.parse(req.body);

    const property = await prisma.property.create({
      data: {
        hostId: req.user.id,
        name: data.name,
        description: data.description,
        type: data.type,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        status: 'ACTIVE', // Active for demo, or PENDING_APPROVAL
        images: data.images?.length
          ? {
              create: data.images.map((img) => ({
                imageUrl: img.imageUrl,
                altText: img.altText,
                sortOrder: img.sortOrder,
              })),
            }
          : undefined,
        amenities: data.amenityIds?.length
          ? {
              create: data.amenityIds.map((id) => ({
                amenity: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        rooms: true,
        amenities: { include: { amenity: true } },
      },
    });

    return res.status(201).json({ property });
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;

    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Check ownership
    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('You do not have permission to edit this property.', 403, 'FORBIDDEN'));
    }

    const updateSchema = createPropertySchema.partial();
    const data = updateSchema.parse(req.body);

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      include: {
        images: true,
        rooms: true,
        amenities: { include: { amenity: true } },
      },
    });

    return res.status(200).json({ property: updated });
  } catch (error) {
    next(error);
  }
};

export const addPropertyImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('Forbidden. Ownership required.', 403, 'FORBIDDEN'));
    }

    const imagesSchema = z.object({
      images: z.array(z.object({
        imageUrl: z.string().url(),
        altText: z.string().optional(),
        sortOrder: z.number().default(0),
      })).min(1),
    });

    const { images } = imagesSchema.parse(req.body);

    const createdImages = await prisma.propertyImage.createMany({
      data: images.map((img) => ({
        propertyId,
        imageUrl: img.imageUrl,
        altText: img.altText,
        sortOrder: img.sortOrder,
      })),
    });

    return res.status(201).json({ created: createdImages.count });
  } catch (error) {
    next(error);
  }
};

export const addPropertyRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('Forbidden. Ownership required.', 403, 'FORBIDDEN'));
    }

    const roomSchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      capacity: z.number().int().min(1),
      pricePerNight: z.number().int().min(1), // minor units
      currency: z.string().default('INR'),
      totalUnits: z.number().int().min(1),
    });

    const data = roomSchema.parse(req.body);

    const room = await prisma.room.create({
      data: {
        propertyId,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        pricePerNight: data.pricePerNight,
        currency: data.currency,
        totalUnits: data.totalUnits,
        isActive: true,
      },
    });

    return res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
};
