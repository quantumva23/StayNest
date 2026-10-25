import { z } from 'zod';
import { PROPERTY_TYPES, ROOM_TYPES } from './search';

const imageSchema = z.object({
  imageUrl: z.string().url('Cover photo must be a valid URL'),
  altText: z.string().optional(),
  sortOrder: z.number().default(0),
});

export const roomInputSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters'),
  description: z.string().optional(),
  roomType: z.enum(ROOM_TYPES, { errorMap: () => ({ message: 'Choose a room type' }) }),
  capacity: z.number().int().min(1, 'Capacity must be at least 1 guest'),
  nightlyPrice: z.number().int().min(100, 'Nightly price must be at least ₹100'),
  currency: z.string().default('INR'),
  totalUnits: z.number().int().min(1, 'Add at least 1 room unit'),
});

export const createPropertySchema = z.object({
  name: z.string().min(3, 'Property name must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(PROPERTY_TYPES, { errorMap: () => ({ message: 'Choose a property type' }) }),
  address: z.string().min(3, 'Address must be at least 3 characters'),
  citySlug: z.string().min(2, 'Choose a city'),
  state: z.string().optional(),
  country: z.string().default('India'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  amenityIds: z.array(z.string()).optional(),
  images: z.array(imageSchema).optional(),
  rooms: z.array(roomInputSchema).min(1, 'Add at least one room'),
});

export const updatePropertySchema = createPropertySchema
  .omit({ rooms: true, citySlug: true, images: true, amenityIds: true })
  .partial()
  .extend({
    citySlug: z.string().min(2, 'Choose a city').optional(),
  });
