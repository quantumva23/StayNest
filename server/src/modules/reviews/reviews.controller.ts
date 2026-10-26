import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const createReviewSchema = z.object({
  propertyId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
});

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required to submit a review.', 401, 'UNAUTHENTICATED'));
    }

    const { propertyId, bookingId, rating, comment } = createReviewSchema.parse({
      ...req.body,
      propertyId: req.params.propertyId || req.body.propertyId,
    });

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Verify user has booked this property
    let bookingToLink = bookingId;

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { room: true },
      });

      if (!booking || booking.guestId !== req.user.id || booking.room.propertyId !== propertyId) {
        return next(new AppError('Invalid reservation reference for this property.', 400, 'INVALID_BOOKING'));
      }

      if (booking.status === 'CANCELLED') {
        return next(new AppError('Cannot review a cancelled reservation.', 400, 'CANCELLED_BOOKING'));
      }

      const existingReview = await prisma.review.findUnique({
        where: { bookingId },
      });

      if (existingReview) {
        return next(new AppError('You have already submitted a review for this reservation.', 400, 'DUPLICATE_REVIEW'));
      }
    } else {
      // Find any valid booking for this user and property
      const validBooking = await prisma.booking.findFirst({
        where: {
          guestId: req.user.id,
          room: { propertyId },
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
          review: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!validBooking && req.user.role !== 'ADMIN') {
        return next(
          new AppError(
            'Only guests with a valid reservation can review this property.',
            403,
            'VERIFIED_BOOKING_REQUIRED'
          )
        );
      }

      if (validBooking) {
        bookingToLink = validBooking.id;
      }
    }

    const review = await prisma.review.create({
      data: {
        propertyId,
        userId: req.user.id,
        bookingId: bookingToLink,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
};

export const getPropertyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      return next(new AppError('Property not found.', 404, 'PROPERTY_NOT_FOUND'));
    }

    const reviews = await prisma.review.findMany({
      where: { propertyId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = reviews.length;
    const averageRating = total > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1))
      : 0;

    return res.status(200).json({
      reviews,
      summary: {
        count: total,
        averageRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    if (!review) {
      return next(new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND'));
    }

    return res.status(200).json({ review });
  } catch (error) {
    next(error);
  }
};
