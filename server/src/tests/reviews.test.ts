import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

describe('StayNest Reviews API', () => {
  const app = createApp();
  let propertyId: string;
  let guestToken: string;
  let guestUserId: string;
  let unbookedGuestToken: string;
  let unbookedUserId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Find an active property
    const property = await prisma.property.findFirst({
      where: { status: 'ACTIVE', hasActiveRooms: true },
      include: { rooms: true },
    });
    if (!property || property.rooms.length === 0) {
      throw new Error('No active property found for testing');
    }
    propertyId = property.id;
    const room = property.rooms[0];

    // Create guest with booking
    const guestUser = await prisma.user.create({
      data: {
        email: `guest_reviewer_${Date.now()}@staynest.dev`,
        name: 'Reviewer Guest',
        role: 'GUEST',
        isActive: true,
      },
    });
    guestUserId = guestUser.id;
    guestToken = jwt.sign(
      { sub: guestUser.id, email: guestUser.email, role: guestUser.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create booking for guest
    const booking = await prisma.booking.create({
      data: {
        guestId: guestUser.id,
        roomId: room.id,
        checkIn: new Date(Date.now() - 3 * 86400000),
        checkOut: new Date(Date.now() - 1 * 86400000),
        guestsCount: 2,
        quantity: 1,
        status: 'CONFIRMED',
        unitPriceSnapshot: room.pricePerNight,
        subtotal: room.pricePerNight * 2,
        fees: 0,
        totalAmount: room.pricePerNight * 2,
        currency: 'INR',
      },
    });
    bookingId = booking.id;

    // Create unbooked user
    const unbookedUser = await prisma.user.create({
      data: {
        email: `unbooked_${Date.now()}@staynest.dev`,
        name: 'Unbooked User',
        role: 'GUEST',
        isActive: true,
      },
    });
    unbookedUserId = unbookedUser.id;
    unbookedGuestToken = jwt.sign(
      { sub: unbookedUser.id, email: unbookedUser.email, role: unbookedUser.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await prisma.review.deleteMany({
      where: { userId: { in: [guestUserId, unbookedUserId] } },
    });
    await prisma.booking.deleteMany({
      where: { guestId: guestUserId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [guestUserId, unbookedUserId] } },
    });
    await prisma.$disconnect();
  });

  it('rejects review submission from unauthenticated client', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${propertyId}/reviews`)
      .send({
        rating: 5,
        comment: 'Unauthenticated attempt',
      });

    expect(res.status).toBe(401);
  });

  it('rejects review from user who never booked this property', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${propertyId}/reviews`)
      .set('Authorization', `Bearer ${unbookedGuestToken}`)
      .send({
        rating: 5,
        comment: 'I did not book this hotel',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('VERIFIED_BOOKING_REQUIRED');
  });

  it('allows verified guest to submit review with rating and comment', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${propertyId}/reviews`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        rating: 5,
        comment: 'Magnificent stay, wonderful architecture and hospitality!',
      });

    expect(res.status).toBe(201);
    expect(res.body.review).toBeDefined();
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.comment).toContain('Magnificent stay');
  });

  it('prevents duplicate review for the same booking', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${propertyId}/reviews`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        rating: 4,
        comment: 'Second review attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
  });

  it('retrieves property reviews and calculated average summary', async () => {
    const res = await request(app)
      .get(`/api/v1/properties/${propertyId}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toBeInstanceOf(Array);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.count).toBeGreaterThan(0);
    expect(res.body.summary.averageRating).toBeGreaterThanOrEqual(1);
  });
});
