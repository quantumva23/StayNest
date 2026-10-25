export const RUPEES_TO_PAISE = 100;

export const PROPERTY_TYPES = ['HOTEL', 'LOUNGE', 'GUEST_HOUSE'] as const;
export const ROOM_TYPES = ['STANDARD', 'DELUXE', 'SUITE', 'STUDIO', 'CABIN', 'FAMILY'] as const;

export type PropertyTypeName = (typeof PROPERTY_TYPES)[number];
export type RoomTypeName = (typeof ROOM_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeName, string> = {
  HOTEL: 'Boutique Hotels',
  LOUNGE: 'Scenic Lounges',
  GUEST_HOUSE: 'Heritage Guest Houses',
};

export const ROOM_TYPE_LABELS: Record<RoomTypeName, string> = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
  STUDIO: 'Studio',
  CABIN: 'Cabin',
  FAMILY: 'Family',
};

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * RUPEES_TO_PAISE);
}

export function unknownCityError(cities: Array<{ name: string; slug: string }>) {
  return {
    statusCode: 400,
    code: 'UNKNOWN_CITY' as const,
    message: 'Choose a city from the list.',
    details: { cities },
  };
}

export function priceInRange(
  pricePerNightPaise: number,
  minRupees?: number,
  maxRupees?: number
): boolean {
  if (minRupees !== undefined && pricePerNightPaise < rupeesToPaise(minRupees)) return false;
  if (maxRupees !== undefined && pricePerNightPaise > rupeesToPaise(maxRupees)) return false;
  return true;
}

export interface SnapshotRoom {
  pricePerNight: number;
  capacity: number;
  isActive: boolean;
}

export function computeSearchSnapshot(rooms: SnapshotRoom[]) {
  const active = rooms.filter((room) => room.isActive);
  if (active.length === 0) {
    return { minPricePerNight: 0, maxCapacity: 0, hasActiveRooms: false };
  }
  return {
    minPricePerNight: Math.min(...active.map((room) => room.pricePerNight)),
    maxCapacity: Math.max(...active.map((room) => room.capacity)),
    hasActiveRooms: true,
  };
}

export interface RoomStock {
  id: string;
  propertyId: string;
  totalUnits: number;
  capacity: number;
}

export interface BookedQuantity {
  roomId: string;
  quantity: number;
}

/** Property ids that still have a free unit on a room that can take the guest count. */
export function propertiesWithAvailability(
  rooms: RoomStock[],
  booked: BookedQuantity[],
  guests?: number
): Set<string> {
  const bookedByRoom = new Map(booked.map((row) => [row.roomId, row.quantity]));
  const available = new Set<string>();

  for (const room of rooms) {
    const used = bookedByRoom.get(room.id) ?? 0;
    const freeUnits = room.totalUnits - used;
    if (freeUnits > 0 && (guests === undefined || room.capacity >= guests)) {
      available.add(room.propertyId);
    }
  }

  return available;
}

export function paginateIds<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
