import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma, transactionOptions } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { overlappingStayWhere } from '../bookings/availability';
import { createPropertySchema, roomInputSchema, updatePropertySchema } from './listingSchema';
import { refreshPropertySearchSnapshot } from './searchSnapshot';
import {
  paginateIds,
  priceInRange,
  propertiesWithAvailability,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  ROOM_TYPE_LABELS,
  ROOM_TYPES,
  rupeesToPaise,
  unknownCityError,
} from './search';

const listPropertiesSchema = z.object({
  city: z.string().optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  amenities: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const cardInclude = {
  images: {
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
  },
  rooms: {
    where: { isActive: true },
    select: {
      roomType: true,
      currency: true,
      capacity: true,
      pricePerNight: true,
    },
    orderBy: { pricePerNight: 'asc' as const },
  },
  amenities: {
    include: { amenity: true },
  },
} satisfies Prisma.PropertyInclude;

type CardProperty = Prisma.PropertyGetPayload<{ include: typeof cardInclude }>;

function toCard(
  property: CardProperty,
  query?: { roomType?: string; guests?: number; minPrice?: number; maxPrice?: number }
) {
  const matching = property.rooms.filter((room) => {
    if (query?.roomType && room.roomType !== query.roomType) return false;
    if (query?.guests && room.capacity < query.guests) return false;
    if (!priceInRange(room.pricePerNight, query?.minPrice, query?.maxPrice)) return false;
    return true;
  });
  const priced = matching.length > 0 ? matching : property.rooms;
  const roomTypes = [...new Set((matching.length > 0 ? matching : property.rooms).map((room) => room.roomType))];
  return {
    id: property.id,
    name: property.name,
    type: property.type,
    city: property.city,
    country: property.country,
    images: property.images.map((image) => ({
      imageUrl: image.imageUrl,
      altText: image.altText,
    })),
    minPricePerNight: priced.length
      ? Math.min(...priced.map((room) => room.pricePerNight))
      : property.minPricePerNight,
    currency: property.rooms[0]?.currency || 'INR',
    roomCount: priced.length,
    roomTypes,
    amenities: property.amenities.map((link) => link.amenity),
  };
}

function emptyPage(page: number, limit: number) {
  return {
    properties: [],
    pagination: { total: 0, page, limit, totalPages: 0 },
  };
}

function roomFilter(query: {
  roomType?: (typeof ROOM_TYPES)[number];
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
}): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = { isActive: true };
  if (query.roomType) where.roomType = query.roomType;
  if (query.guests) where.capacity = { gte: query.guests };
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.pricePerNight = {
      ...(query.minPrice !== undefined ? { gte: rupeesToPaise(query.minPrice) } : {}),
      ...(query.maxPrice !== undefined ? { lte: rupeesToPaise(query.maxPrice) } : {}),
    };
  }
  return where;
}

export const getProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listPropertiesSchema.parse(req.query);
    const { city, type, guests, amenities, sort, page, limit, checkIn, checkOut } = query;
    const rooms = roomFilter(query);

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
      hasActiveRooms: true,
      rooms: { some: rooms },
    };

    if (guests) where.maxCapacity = { gte: guests };
    if (type) where.type = type;

    if (city?.trim()) {
      const location = await prisma.city.findFirst({
        where: {
          OR: [
            { slug: city.trim().toLowerCase() },
            { name: { equals: city.trim(), mode: 'insensitive' } },
          ],
        },
      });
      if (!location) {
        return res.status(200).json(emptyPage(page, limit));
      }
      where.cityId = location.id;
    }

    if (amenities?.trim()) {
      const tokens = amenities.split(',').map((token) => token.trim()).filter(Boolean);
      const found = await prisma.amenity.findMany({
        where: {
          OR: [
            { id: { in: tokens } },
            { name: { in: tokens, mode: 'insensitive' } },
          ],
        },
      });
      if (found.length < tokens.length) {
        return res.status(200).json(emptyPage(page, limit));
      }
      where.AND = found.map((amenity) => ({
        amenities: { some: { amenityId: amenity.id } },
      }));
    }

    let parsedCheckIn: Date | null = null;
    let parsedCheckOut: Date | null = null;
    if (checkIn || checkOut) {
      if (!checkIn || !checkOut) {
        return next(new AppError('Choose both a check-in and a check-out date.', 400, 'INVALID_DATE_RANGE'));
      }
      parsedCheckIn = new Date(checkIn);
      parsedCheckOut = new Date(checkOut);
      if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
        return next(new AppError('Use dates in YYYY-MM-DD format.', 400, 'INVALID_DATE'));
      }
      if (parsedCheckOut <= parsedCheckIn) {
        return next(new AppError('Check-out must be after check-in.', 400, 'INVALID_DATE_RANGE'));
      }
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      sort === 'price_asc'
        ? { minPricePerNight: 'asc' }
        : sort === 'price_desc'
          ? { minPricePerNight: 'desc' }
          : { createdAt: 'desc' };

    if (parsedCheckIn && parsedCheckOut) {
      const ordered = await prisma.property.findMany({
        where,
        orderBy,
        select: { id: true },
      });
      const propertyIds = ordered.map((property) => property.id);
      const stock = propertyIds.length
        ? await prisma.room.findMany({
            where: { propertyId: { in: propertyIds }, ...rooms },
            select: { id: true, propertyId: true, totalUnits: true, capacity: true },
          })
        : [];

      const booked = stock.length
        ? await prisma.booking.groupBy({
            by: ['roomId'],
            where: overlappingStayWhere(
              { in: stock.map((room) => room.id) },
              parsedCheckIn,
              parsedCheckOut,
              new Date()
            ),
            _sum: { quantity: true },
          })
        : [];

      const available = propertiesWithAvailability(
        stock,
        booked.map((row) => ({ roomId: row.roomId, quantity: row._sum.quantity ?? 0 })),
        guests
      );
      const pageResult = paginateIds(
        propertyIds.filter((id) => available.has(id)),
        page,
        limit
      );

      const rows = pageResult.items.length
        ? await prisma.property.findMany({
            where: { id: { in: pageResult.items } },
            include: cardInclude,
          })
        : [];
      const byId = new Map(rows.map((row) => [row.id, row]));

      return res.status(200).json({
        properties: pageResult.items
          .map((id) => byId.get(id))
          .filter((row): row is CardProperty => Boolean(row))
          .map((row) => toCard(row, query)),
        pagination: {
          total: pageResult.total,
          page: pageResult.page,
          limit: pageResult.limit,
          totalPages: pageResult.totalPages,
        },
      });
    }

    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: cardInclude,
      }),
    ]);

    return res.status(200).json({
      properties: rows.map((row) => toCard(row, query)),
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const active = { status: 'ACTIVE' as const, hasActiveRooms: true };
    const [typeGroups, cityGroups, roomRows, cities] = await Promise.all([
      prisma.property.groupBy({
        by: ['type'],
        where: active,
        _count: { _all: true },
      }),
      prisma.property.groupBy({
        by: ['cityId'],
        where: active,
        _count: { _all: true },
      }),
      prisma.room.findMany({
        where: { isActive: true, property: active },
        select: { roomType: true, propertyId: true },
      }),
      prisma.city.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const typeCount = new Map(typeGroups.map((group) => [group.type, group._count._all]));
    const cityCount = new Map(cityGroups.map((group) => [group.cityId, group._count._all]));
    const roomProperties = new Map<string, Set<string>>();
    for (const row of roomRows) {
      const set = roomProperties.get(row.roomType) ?? new Set<string>();
      set.add(row.propertyId);
      roomProperties.set(row.roomType, set);
    }

    return res.status(200).json({
      propertyTypes: PROPERTY_TYPES.map((id) => ({
        id,
        label: PROPERTY_TYPE_LABELS[id],
        count: typeCount.get(id) ?? 0,
      })),
      roomTypes: ROOM_TYPES.map((id) => ({
        id,
        label: ROOM_TYPE_LABELS[id],
        count: roomProperties.get(id)?.size ?? 0,
      })),
      cities: cities.map((city) => ({
        id: city.id,
        name: city.name,
        slug: city.slug,
        state: city.state,
        country: city.country,
        count: cityCount.get(city.id) ?? 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getCities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, state: true, country: true },
    });
    return res.status(200).json({ cities });
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
        images: { orderBy: { sortOrder: 'asc' } },
        rooms: {
          where: { isActive: true },
          orderBy: { pricePerNight: 'asc' },
        },
        amenities: { include: { amenity: true } },
        host: { select: { id: true, name: true } },
      },
    });

    if (!property) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    if (property.status !== 'ACTIVE') {
      if (!req.user || (req.user.role !== 'ADMIN' && req.user.id !== property.hostId)) {
        return next(new AppError('This listing is not public.', 404, 'PROPERTY_NOT_FOUND'));
      }
    }

    return res.status(200).json({
      property: {
        ...property,
        amenities: property.amenities.map((link) => link.amenity),
      },
    });
  } catch (error) {
    next(error);
  }
};

async function requireCity(slug: string) {
  const location = await prisma.city.findUnique({ where: { slug } });
  if (!location) {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { name: true, slug: true },
    });
    const unknown = unknownCityError(cities);
    throw new AppError(unknown.message, unknown.statusCode, unknown.code, unknown.details);
  }
  return location;
}

export const createProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Sign in to publish a listing.', 401, 'UNAUTHENTICATED'));
    }

    const data = createPropertySchema.parse(req.body);
    const location = await requireCity(data.citySlug);

    if (data.amenityIds?.length) {
      const found = await prisma.amenity.count({ where: { id: { in: data.amenityIds } } });
      if (found !== new Set(data.amenityIds).size) {
        return next(new AppError('A selected amenity is no longer available.', 400, 'INVALID_REFERENCE'));
      }
    }

    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          hostId: req.user!.id,
          name: data.name,
          description: data.description,
          type: data.type,
          address: data.address,
          city: location.name,
          cityId: location.id,
          state: data.state ?? location.state,
          country: location.country || data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          status: 'PENDING_APPROVAL',
          images: data.images?.length
            ? {
                create: data.images.map((image) => ({
                  imageUrl: image.imageUrl,
                  altText: image.altText,
                  sortOrder: image.sortOrder,
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
          rooms: {
            create: data.rooms.map((room) => ({
              name: room.name,
              description: room.description,
              roomType: room.roomType,
              capacity: room.capacity,
              pricePerNight: rupeesToPaise(room.nightlyPrice),
              currency: room.currency,
              totalUnits: room.totalUnits,
              isActive: true,
            })),
          },
        },
      });

      await refreshPropertySearchSnapshot(tx, created.id);

      return tx.property.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          images: true,
          rooms: true,
          amenities: { include: { amenity: true } },
        },
      });
    }, transactionOptions);

    return res.status(201).json({ property });
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Sign in to edit a listing.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;
    const existing = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }
    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('You can only edit your own listing.', 403, 'FORBIDDEN'));
    }

    const data = updatePropertySchema.parse(req.body);
    const location = data.citySlug ? await requireCity(data.citySlug) : null;

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        address: data.address,
        city: location?.name,
        cityId: location?.id,
        state: location ? (data.state ?? location.state) : data.state,
        country: location ? location.country || data.country : data.country,
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
      return next(new AppError('Sign in to add photos.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;
    const existing = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }
    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('You can only edit your own listing.', 403, 'FORBIDDEN'));
    }

    const imagesSchema = z.object({
      images: z.array(z.object({
        imageUrl: z.string().url('Each photo must be a valid URL'),
        altText: z.string().optional(),
        sortOrder: z.number().default(0),
      })).min(1, 'Add at least one photo'),
    });
    const { images } = imagesSchema.parse(req.body);

    const createdImages = await prisma.propertyImage.createMany({
      data: images.map((image) => ({
        propertyId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder,
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
      return next(new AppError('Sign in to add a room.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId } = req.params;
    const existing = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existing) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }
    if (req.user.role !== 'ADMIN' && existing.hostId !== req.user.id) {
      return next(new AppError('You can only edit your own listing.', 403, 'FORBIDDEN'));
    }

    const data = roomInputSchema.parse(req.body);

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          propertyId,
          name: data.name,
          description: data.description,
          roomType: data.roomType,
          capacity: data.capacity,
          pricePerNight: rupeesToPaise(data.nightlyPrice),
          currency: data.currency,
          totalUnits: data.totalUnits,
          isActive: true,
        },
      });
      await refreshPropertySearchSnapshot(tx, propertyId);
      return created;
    }, transactionOptions);

    return res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
};
