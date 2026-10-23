import dotenv from 'dotenv';
import path from 'path';

// Load from server/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/staynest?schema=public',
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'staynest-secret-key-development-minimum-32-chars-long',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',

  // Payments
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'sandbox_mock',
  PAYMENT_KEY_ID: process.env.PAYMENT_KEY_ID || 'rzp_test_placeholder_key',
  PAYMENT_KEY_SECRET: process.env.PAYMENT_KEY_SECRET || 'rzp_test_placeholder_secret',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'rzp_test_webhook_secret',

  // Booking Hold duration in minutes
  HOLD_DURATION_MINUTES: parseInt(process.env.HOLD_DURATION_MINUTES || '15', 10),
};
