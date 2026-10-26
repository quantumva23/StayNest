import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

function same(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password.trim(), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  const rawPassword = password;
  const trimmedPassword = password.trim();

  // 1. Scrypt format: scrypt$<salt>$<hash>
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    const salt = parts[1];
    const hash = parts[2];
    if (!salt || !hash) return false;

    const hashBuffer = Buffer.from(hash, 'hex');

    // Test trimmed password first
    const derivedTrimmed = scryptSync(trimmedPassword, salt, 64);
    if (same(derivedTrimmed, hashBuffer)) return true;

    // Test untrimmed password if different
    if (rawPassword !== trimmedPassword) {
      const derivedRaw = scryptSync(rawPassword, salt, 64);
      if (same(derivedRaw, hashBuffer)) return true;
    }

    return false;
  }

  // 2. Legacy SHA-256 hashes across known environment secrets
  const candidateSecrets = [
    env.JWT_SECRET,
    'staynest-secret-key-development-minimum-32-chars-long',
    'dev-jwt-secret-min-32-chars-long-staynest-booking-platform',
    '',
  ];

  const candidatePasswords = rawPassword === trimmedPassword ? [rawPassword] : [trimmedPassword, rawPassword];

  for (const pw of candidatePasswords) {
    for (const secret of candidateSecrets) {
      const legacy = createHash('sha256').update(pw + secret).digest();
      if (same(legacy, Buffer.from(stored, 'hex'))) return true;
    }
  }

  // 3. Plaintext fallback (legacy database migrations)
  if (stored === rawPassword || stored === trimmedPassword) {
    return true;
  }

  return false;
}
