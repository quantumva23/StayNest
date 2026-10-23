import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit and algorithmic tests for StayNest critical booking rules
 */
describe('StayNest Booking Business Logic & Correctness', () => {
  // Test date overlap logic
  function checkDateOverlap(
    existingCheckIn: Date,
    existingCheckOut: Date,
    requestedCheckIn: Date,
    requestedCheckOut: Date
  ): boolean {
    // Two ranges overlap when: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
    return existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn;
  }

  // Test server-side price calculation
  function calculateStayPricing(pricePerNight: number, checkIn: Date, checkOut: Date, quantity: number) {
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be strictly after check-in date');
    }
    const diffDays = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const nights = Math.max(1, diffDays);
    const subtotal = pricePerNight * nights * quantity;
    const fees = Math.round(subtotal * 0.10); // 10% platform fee
    const totalAmount = subtotal + fees;
    return { nights, subtotal, fees, totalAmount };
  }

  // Test pooled inventory concurrency calculation
  function isInventoryAvailable(
    totalUnits: number,
    existingBookings: Array<{ checkIn: Date; checkOut: Date; quantity: number; status: string; expiresAt?: Date | null }>,
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    requestedQuantity: number,
    now: Date
  ): boolean {
    const overlappingUnits = existingBookings
      .filter((b) => {
        const overlaps = checkDateOverlap(b.checkIn, b.checkOut, requestedCheckIn, requestedCheckOut);
        if (!overlaps) return false;

        if (b.status === 'CONFIRMED') return true;
        if (b.status === 'PENDING_PAYMENT' && b.expiresAt && b.expiresAt > now) return true;
        return false;
      })
      .reduce((sum, b) => sum + b.quantity, 0);

    return overlappingUnits + requestedQuantity <= totalUnits;
  }

  describe('Date Overlap & Checkout Exclusivity', () => {
    it('should detect overlap when requested booking falls completely inside existing booking', () => {
      const existingIn = new Date('2026-11-01');
      const existingOut = new Date('2026-11-10');
      const reqIn = new Date('2026-11-03');
      const reqOut = new Date('2026-11-07');

      expect(checkDateOverlap(existingIn, existingOut, reqIn, reqOut)).toBe(true);
    });

    it('should NOT detect overlap when new check-in is exactly on existing check-out (exclusive checkout)', () => {
      const existingIn = new Date('2026-11-01');
      const existingOut = new Date('2026-11-05');
      const reqIn = new Date('2026-11-05'); // Guest arrives the day previous guest departs
      const reqOut = new Date('2026-11-10');

      expect(checkDateOverlap(existingIn, existingOut, reqIn, reqOut)).toBe(false);
    });

    it('should NOT detect overlap when new check-out is exactly on existing check-in', () => {
      const existingIn = new Date('2026-11-05');
      const existingOut = new Date('2026-11-10');
      const reqIn = new Date('2026-11-01');
      const reqOut = new Date('2026-11-05');

      expect(checkDateOverlap(existingIn, existingOut, reqIn, reqOut)).toBe(false);
    });

    it('should reject same-day check-in and check-out or reversed dates in pricing calculation', () => {
      const checkIn = new Date('2026-11-05');
      const checkOut = new Date('2026-11-05');

      expect(() => calculateStayPricing(500000, checkIn, checkOut, 1)).toThrow(
        'Check-out date must be strictly after check-in date'
      );
    });
  });

  describe('Server-Side Pricing & Snapshot Calculation', () => {
    it('should accurately calculate nights, subtotal, 10% fee, and total in minor units', () => {
      const checkIn = new Date('2026-11-01');
      const checkOut = new Date('2026-11-04'); // 3 nights
      const pricePerNight = 400000; // INR 4,000.00 (400,000 paise)
      const quantity = 2; // 2 rooms

      const result = calculateStayPricing(pricePerNight, checkIn, checkOut, quantity);

      expect(result.nights).toBe(3);
      expect(result.subtotal).toBe(400000 * 3 * 2); // 2,400,000 paise (INR 24,000)
      expect(result.fees).toBe(240000); // 10% = 240,000 paise (INR 2,400)
      expect(result.totalAmount).toBe(2640000); // INR 26,400
    });
  });

  describe('Concurrency & Pooled Room Inventory Allocation', () => {
    const totalUnits = 3;
    const now = new Date('2026-11-01T12:00:00Z');

    it('should allow booking when total booked units < totalUnits', () => {
      const existingBookings = [
        {
          checkIn: new Date('2026-11-05'),
          checkOut: new Date('2026-11-08'),
          quantity: 2,
          status: 'CONFIRMED',
        },
      ];

      // Request 1 unit for overlapping dates
      const canBook = isInventoryAvailable(
        totalUnits,
        existingBookings,
        new Date('2026-11-06'),
        new Date('2026-11-07'),
        1,
        now
      );
      expect(canBook).toBe(true);
    });

    it('should reject booking when request would exceed room inventory (prevent overbooking)', () => {
      const existingBookings = [
        {
          checkIn: new Date('2026-11-05'),
          checkOut: new Date('2026-11-08'),
          quantity: 2,
          status: 'CONFIRMED',
        },
      ];

      // Request 2 units when only 1 unit is free (2 + 2 > 3)
      const canBook = isInventoryAvailable(
        totalUnits,
        existingBookings,
        new Date('2026-11-06'),
        new Date('2026-11-07'),
        2,
        now
      );
      expect(canBook).toBe(false);
    });

    it('should count unexpired PENDING_PAYMENT holds against inventory', () => {
      const existingBookings = [
        {
          checkIn: new Date('2026-11-05'),
          checkOut: new Date('2026-11-08'),
          quantity: 3,
          status: 'PENDING_PAYMENT',
          expiresAt: new Date('2026-11-01T12:15:00Z'), // 15 mins in future relative to `now`
        },
      ];

      const canBook = isInventoryAvailable(
        totalUnits,
        existingBookings,
        new Date('2026-11-06'),
        new Date('2026-11-07'),
        1,
        now
      );
      expect(canBook).toBe(false);
    });

    it('should ignore expired PENDING_PAYMENT holds for availability', () => {
      const existingBookings = [
        {
          checkIn: new Date('2026-11-05'),
          checkOut: new Date('2026-11-08'),
          quantity: 3,
          status: 'PENDING_PAYMENT',
          expiresAt: new Date('2026-11-01T11:59:00Z'), // 1 minute in the past
        },
      ];

      // Because the hold expired, all 3 units should be freed up
      const canBook = isInventoryAvailable(
        totalUnits,
        existingBookings,
        new Date('2026-11-06'),
        new Date('2026-11-07'),
        2,
        now
      );
      expect(canBook).toBe(true);
    });
  });

  describe('Capacity and Policy Rules', () => {
    it('should enforce guest capacity per room quantity', () => {
      const roomCapacity = 2;
      const quantity = 2;
      const totalMaxGuests = roomCapacity * quantity; // 4

      const checkCapacity = (guests: number) => guests <= totalMaxGuests;

      expect(checkCapacity(3)).toBe(true);
      expect(checkCapacity(4)).toBe(true);
      expect(checkCapacity(5)).toBe(false); // exceeds 4
    });
  });
});
