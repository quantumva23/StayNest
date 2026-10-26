import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, verifyPassword } from './password';

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['GUEST', 'HOST']).optional().default('GUEST'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createAuthSession(user: { id: string; email: string; role: any }) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { token, refreshToken: rawRefreshToken };
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password, role } = registerSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return next(new AppError('An account with this email already exists.', 400, 'USER_EXISTS'));
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: role === 'HOST' ? 'HOST' : 'GUEST',
        isActive: true,
      },
    });

    const { token, refreshToken } = await createAuthSession(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      token,
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (!user.passwordHash.startsWith('scrypt$')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }

    const { token, refreshToken } = await createAuthSession(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      token,
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    const rawToken = (parsed.success && parsed.data.refreshToken) || req.cookies?.refreshToken;

    if (!rawToken) {
      return next(new AppError('Refresh token required.', 401, 'UNAUTHENTICATED'));
    }

    const tokenHash = hashRefreshToken(rawToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return next(new AppError('Invalid or expired refresh token. Please log in again.', 401, 'INVALID_REFRESH_TOKEN'));
    }

    if (!storedToken.user.isActive) {
      return next(new AppError('Your account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    // Revoke current refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new session tokens
    const { token, refreshToken: newRefreshToken } = await createAuthSession(storedToken.user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      token,
      accessToken: token,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  const rawToken = (parsed.success && parsed.data.refreshToken) || req.cookies?.refreshToken;

  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  }

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Successfully logged out.' });
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthenticated.', 401, 'UNAUTHENTICATED'));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            properties: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      return next(new AppError('User profile not found.', 404, 'NOT_FOUND'));
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
