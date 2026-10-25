import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

function same(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    return same(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
  }

  const legacy = createHash('sha256').update(password + env.JWT_SECRET).digest();
  return same(legacy, Buffer.from(stored, 'hex'));
}
