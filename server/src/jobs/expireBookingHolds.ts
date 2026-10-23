import { prisma } from '../config/database';

/**
 * Periodically marks unpaid holds as EXPIRED so they no longer count against room availability.
 */
export async function expireBookingHolds(): Promise<number> {
  try {
    const result = await prisma.booking.updateMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      console.log(`[Sweeper] Expired ${result.count} unpaid booking holds.`);
    }
    return result.count;
  } catch (err) {
    console.error('[Sweeper] Error expiring booking holds:', err);
    return 0;
  }
}

let intervalTimer: NodeJS.Timeout | null = null;

export function startBookingHoldSweeper(intervalMs = 60000) {
  if (intervalTimer) return;
  // Run once immediately
  expireBookingHolds();
  intervalTimer = setInterval(() => {
    expireBookingHolds();
  }, intervalMs);
}

export function stopBookingHoldSweeper() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
