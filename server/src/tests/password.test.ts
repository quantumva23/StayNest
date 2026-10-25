import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../modules/auth/password';
import { env } from '../config/env';

describe('password hashing', () => {
  it('verifies a scrypt hash and rejects the wrong password', () => {
    const stored = hashPassword('password123');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('password123', stored)).toBe(true);
    expect(verifyPassword('nope', stored)).toBe(false);
  });

  it('still accepts a legacy sha256 hash so existing accounts can sign in once', () => {
    const legacy = createHash('sha256').update('password123' + env.JWT_SECRET).digest('hex');
    expect(verifyPassword('password123', legacy)).toBe(true);
    expect(verifyPassword('nope', legacy)).toBe(false);
  });
});