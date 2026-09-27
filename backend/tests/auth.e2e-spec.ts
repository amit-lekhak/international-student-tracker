import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Authentication & Session Management (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully authenticate Admin with valid credentials and set HttpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@tracker.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: 'admin@tracker.com',
        role: 'ADMIN',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/jwt=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('should authenticate case-insensitively for email address', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ADMIN@TRACKER.COM',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.user.email).toBe('admin@tracker.com');
    });

    it('should successfully authenticate Agent with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'agent1@tracker.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.user).toMatchObject({
        email: 'agent1@tracker.com',
        role: 'AGENT',
      });
      expect(response.body.user.agentId).toBeDefined();
      expect(typeof response.body.user.agentId).toBe('string');
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@tracker.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid email or password/i);
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should reject non-existent user with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@tracker.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject malformed payload with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: '123', // less than 6 chars
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    let adminToken: string;
    let adminCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'admin@tracker.com',
        password: 'password123',
      });

      adminToken = loginRes.body.accessToken;
      adminCookie = loginRes.headers['set-cookie'][0];
    });

    it('should authenticate via HttpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'admin@tracker.com',
        role: 'ADMIN',
      });
    });

    it('should authenticate via Bearer header fallback', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'admin@tracker.com',
        role: 'ADMIN',
      });
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should reject malformed or invalid Bearer token with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.malformed.token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie on logout', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/logout').expect(200);

      expect(response.body).toEqual({ message: 'Logged out successfully' });
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/jwt=;/);
    });
  });
});
