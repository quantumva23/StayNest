import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: details[0]?.message || 'Check the highlighted fields and try again.',
        details,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(' ') : String(err.meta?.target || '');
      const message = target.includes('email')
        ? 'An account with this email already exists.'
        : target.includes('slug')
          ? 'That city is already used.'
          : 'That email or city is already used.';
      return res.status(409).json({
        error: { code: 'DUPLICATE', message },
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'That record is no longer available.' },
      });
    }

    if (err.code === 'P2003') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REFERENCE',
          message: 'A selected amenity or city is no longer available.',
        },
      });
    }

    if (err.code === 'P2028') {
      console.error('[DatabaseBusy]', err.message);
      return res.status(409).json({
        error: {
          code: 'DB_BUSY',
          message: 'The database was busy and this save did not finish. Try again.',
        },
      });
    }
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle SyntaxError (e.g. invalid JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload',
      },
    });
  }

  // Log unexpected errors safely without leaking internal secrets
  console.error('[UnhandledError]', {
    message: err.message,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
};
