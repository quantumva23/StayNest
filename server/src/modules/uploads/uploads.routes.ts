import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const uploadDir = path.resolve(__dirname, '../../../uploads');

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole(['HOST', 'ADMIN']),
  express.raw({ type: Object.keys(extensions), limit: '2mb' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.header('content-type')?.split(';')[0].trim() || '';
      const extension = extensions[type];
      if (!extension || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        return next(new AppError('Upload a JPEG, PNG, or WebP image under 2 MB.', 400, 'INVALID_IMAGE'));
      }

      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filename = `${randomBytes(16).toString('hex')}.${extension}`;
      await fs.promises.writeFile(path.join(uploadDir, filename), req.body);

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      return res.status(201).json({ imageUrl });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
