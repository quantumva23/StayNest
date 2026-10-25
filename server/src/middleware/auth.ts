import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Missing token.', 401, 'UNAUTHENTICATED'));
    }

    let userId: string | null = null;

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub?: string; id?: string; userId?: string };
      userId = decoded.sub || decoded.id || decoded.userId || null;
    } catch {
      return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
    }

    if (!userId) {
      return next(new AppError('Invalid token payload.', 401, 'INVALID_TOKEN'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(new AppError('User account profile not found.', 401, 'ACCOUNT_NOT_FOUND'));
    }

    if (!user.isActive) {
      return next(new AppError('Account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden. Requires one of [${allowedRoles.join(', ')}] permissions.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
