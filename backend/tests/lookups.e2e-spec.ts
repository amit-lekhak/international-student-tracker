import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Lookups Endpoints (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;

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

    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'admin@tracker.com',
      password: 'password123',
    });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/schools', () => {
    it('should return all 8 partner schools sorted alphabetically', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/schools')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(8);

      const names = response.body.map((s: any) => s.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);

      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('country');
      expect(response.headers['cache-control']).toBeDefined();
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/api/schools').expect(401);
    });
  });

  describe('GET /api/programs', () => {
    it('should return all 16 programs with hydrated parent school', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(16);

      const first = response.body[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('schoolId');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('tuitionUsd');
      expect(first).toHaveProperty('school');
      expect(first.school).toHaveProperty('name');
    });

    it('should filter programs by schoolId query parameter', async () => {
      const schoolsRes = await request(app.getHttpServer())
        .get('/api/schools')
        .set('Authorization', `Bearer ${adminToken}`);
      const schoolId = schoolsRes.body[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/programs?schoolId=${schoolId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      for (const program of response.body) {
        expect(program.schoolId).toBe(schoolId);
      }
    });

    it('should return empty array when filtering by a valid UUID with no programs', async () => {
      const nonExistentSchoolId = '00000000-0000-4000-8000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/programs?schoolId=${nonExistentSchoolId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should reject invalid UUID for schoolId filter with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/programs?schoolId=invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/agents', () => {
    it('should return all 12 partner agencies sorted alphabetically', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(12);

      const names = response.body.map((a: any) => a.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);

      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('country');
      expect(response.body[0]).toHaveProperty('tier');
    });
  });
});
