import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/database';

describe('StayNest Authentication API', () => {
  const app = createApp();
  const testEmail = `testuser_${Date.now()}@staynest.dev`;
  const testPassword = 'Password123!';
  let accessToken: string;
  let refreshToken: string;

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.$disconnect();
  });

  it('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        name: 'Test Guest',
        password: testPassword,
        role: 'GUEST',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        name: 'Duplicate Guest',
        password: testPassword,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_EXISTS');
  });

  it('authenticates with correct credentials and returns tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'wrongPassword456',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('fetches authenticated user profile via /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  it('rotates refresh token and issues a new access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    // Old refresh token must now be revoked
    const reusedRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(reusedRes.status).toBe(401);
    expect(reusedRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    refreshToken = res.body.refreshToken;
  });

  it('revokes refresh token on logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);

    const afterLogoutRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(afterLogoutRes.status).toBe(401);
  });
});
