import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Interactive booking transactions need a session connection. The pooler URL drops them.
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Remote Postgres often spends the default 5s just waiting on a lock or a connection.
export const transactionOptions = { maxWait: 15_000, timeout: 20_000 };
