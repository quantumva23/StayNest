import { createApp } from './app';
import { env } from './config/env';
import { startBookingHoldSweeper, stopBookingHoldSweeper } from './jobs/expireBookingHolds';
import { ensureLocalCatalog } from './scripts/importLocalCatalog';

const app = createApp();

let server: ReturnType<typeof app.listen> | undefined;

ensureLocalCatalog()
  .catch((error) => {
    const text = error instanceof Error ? error.message : String(error);
    console.error('[catalog]', text.split('\n').filter(Boolean)[0]);
  })
  .finally(() => {
    server = app.listen(env.PORT, () => {
      console.log(`[StayNest Server] Running on http://localhost:${env.PORT}`);
      console.log(`[StayNest Server] Environment: ${env.NODE_ENV}`);
      console.log(`[StayNest Server] Frontend URL: ${env.FRONTEND_URL}`);

      // Start background job to sweep expired holds every 60s
      startBookingHoldSweeper(60000);
    });
  });

const gracefulShutdown = () => {
  console.log('[StayNest Server] Gracefully shutting down...');
  stopBookingHoldSweeper();
  server?.close(() => {
    console.log('[StayNest Server] Closed remaining connections.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
