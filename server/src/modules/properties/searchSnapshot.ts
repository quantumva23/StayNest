import { Prisma } from '@prisma/client';
import { computeSearchSnapshot } from './search';

type SnapshotClient = Prisma.TransactionClient | { room: Prisma.TransactionClient['room']; property: Prisma.TransactionClient['property'] };

export async function refreshPropertySearchSnapshot(db: SnapshotClient, propertyId: string) {
  const rooms = await db.room.findMany({
    where: { propertyId },
    select: { pricePerNight: true, capacity: true, isActive: true },
  });

  const snapshot = computeSearchSnapshot(rooms);

  await db.property.update({
    where: { id: propertyId },
    data: snapshot,
  });

  return snapshot;
}
