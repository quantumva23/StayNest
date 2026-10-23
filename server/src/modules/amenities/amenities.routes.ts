import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ amenities });
  } catch (error) {
    next(error);
  }
});

export default router;
