import { Prisma } from '@prisma/client';

/** Confirmed stays and unexpired payment holds that overlap [checkIn, checkOut). */
export function overlappingStayWhere(
  roomId: string | Prisma.StringFilter,
  checkIn: Date,
  checkOut: Date,
  now: Date
): Prisma.BookingWhereInput {
  return {
    roomId,
    checkIn: { lt: checkOut },
    checkOut: { gt: checkIn },
    OR: [
      { status: 'CONFIRMED' },
      { status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
    ],
  };
}
