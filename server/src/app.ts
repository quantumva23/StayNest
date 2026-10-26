import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import propertiesRoutes from './modules/properties/properties.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import hostRoutes from './modules/host/host.routes';
import adminRoutes from './modules/admin/admin.routes';
import amenitiesRoutes from './modules/amenities/amenities.routes';
import citiesRoutes from './modules/cities/cities.routes';
import path from 'path';
import uploadsRoutes, { uploadDir } from './modules/uploads/uploads.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import { photosDir } from './scripts/importLocalCatalog';

export const imagesDir = path.resolve(__dirname, '../images');

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Parse JSON with rawBody capturing for webhook signature verification
  app.use(
    express.json({
      limit: '100kb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  app.use(cookieParser());

  const setCorp = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  };

  const serverUploadsDir = path.resolve(__dirname, '../uploads');
  const rootUploadsDir = path.resolve(__dirname, '../../uploads');
  const propertiesUploadsDir = path.resolve(serverUploadsDir, 'properties');
  const rootPropertiesUploadsDir = path.resolve(rootUploadsDir, 'properties');
  const photosDirectory = path.resolve(__dirname, '../../photos');
  const serverRoomsImagesDir = path.resolve(__dirname, '../roomsimages');
  const rootRoomsImagesDir = path.resolve(__dirname, '../../roomsimages');

  app.use('/uploads', setCorp, express.static(serverUploadsDir));
  app.use('/uploads', setCorp, express.static(rootUploadsDir));
  app.use('/uploads/properties', setCorp, express.static(propertiesUploadsDir));
  app.use('/uploads/properties', setCorp, express.static(rootPropertiesUploadsDir));

  app.use('/images', setCorp, express.static(imagesDir));
  app.use('/images', setCorp, express.static(propertiesUploadsDir));
  app.use('/images', setCorp, express.static(rootPropertiesUploadsDir));

  app.use('/photos', setCorp, express.static(propertiesUploadsDir));
  app.use('/photos', setCorp, express.static(photosDirectory));
  app.use('/catalog-photos', setCorp, express.static(propertiesUploadsDir));
  app.use('/catalog-photos', setCorp, express.static(photosDirectory));

  app.use('/roomsimages', setCorp, express.static(serverRoomsImagesDir));
  app.use('/roomsimages', setCorp, express.static(rootRoomsImagesDir));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'StayNest API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Base API v1 router
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/properties', propertiesRoutes);
  apiRouter.use('/rooms', roomsRoutes);
  apiRouter.use('/bookings', bookingsRoutes);
  apiRouter.use('/payments', paymentsRoutes);
  apiRouter.use('/reviews', reviewsRoutes);
  apiRouter.use('/host', hostRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/amenities', amenitiesRoutes);
  apiRouter.use('/cities', citiesRoutes);
  apiRouter.use('/uploads', uploadsRoutes);

  app.use('/api/v1', apiRouter);

  // 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
