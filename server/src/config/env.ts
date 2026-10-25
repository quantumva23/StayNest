import dotenv from 'dotenv';
import path from 'path';

// .env is the usual name. `env` is the file checked in this workspace.
for (const name of ['.env', 'env']) {
  dotenv.config({ path: path.resolve(process.cwd(), name) });
  dotenv.config({ path: path.resolve(process.cwd(), '..', name) });
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/staynest?schema=public',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'staynest-secret-key-development-minimum-32-chars-long',

  // Payments
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'sandbox_mock',
  PAYMENT_KEY_ID: process.env.PAYMENT_KEY_ID || 'rzp_test_placeholder_key',
  PAYMENT_KEY_SECRET: process.env.PAYMENT_KEY_SECRET || 'rzp_test_placeholder_secret',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'rzp_test_webhook_secret',

  // Booking Hold duration in minutes
  HOLD_DURATION_MINUTES: parseInt(process.env.HOLD_DURATION_MINUTES || '15', 10),
};
