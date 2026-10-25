import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/staynest?schema=public';

// A leftover cloud URL in the env file must not override the local database.
const configured = process.env.DATABASE_URL || '';
export const databaseUrl = !configured || /supabase\.com/i.test(configured) ? LOCAL_DATABASE_URL : configured;

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export const transactionOptions = { maxWait: 15_000, timeout: 20_000 };
