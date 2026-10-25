import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
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

// Auth calls are HTTP. Realtime needs a browser WebSocket, which Node 20 does not have.
class UnusedSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 3;
  url = '';
  protocol = '';
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const supabase = (env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedSocket as any },
    })
  : null;

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
    let email: string | null = null;

    // 1. Try Supabase Auth token verification if client is configured
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          userId = data.user.id;
          email = data.user.email || null;
        }
      } catch (e) {
        // Fall back to direct JWT verification
      }
    }

    // 2. Fallback to standard JWT verification (for local dev, tests, or Supabase JWT secret)
    if (!userId) {
      const secrets = [...new Set([env.JWT_SECRET, env.SUPABASE_JWT_SECRET].filter(Boolean))];
      for (const secret of secrets) {
        try {
          const decoded = jwt.verify(token, secret) as any;
          userId = decoded.sub || decoded.id || decoded.userId;
          email = decoded.email || null;
          break;
        } catch {
          // Try the next signing secret.
        }
      }
      if (!userId) {
        return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
      }
    }

    if (!userId) {
      return next(new AppError('Invalid token payload.', 401, 'INVALID_TOKEN'));
    }

    // 3. Look up user profile in database to enforce server-side role & active status
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If user profile is not yet in the DB but Supabase authenticated them, auto-provision profile
    if (!user && email) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'GUEST',
          isActive: true,
        },
      });
    }

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
