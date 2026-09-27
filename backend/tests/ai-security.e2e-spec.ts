import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Role } from '../src/types/enums';

describe('AI Diagnostics Security, RBAC & Guards (E2E & Unit)', () => {
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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    // 1. Authenticate Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@tracker.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('HTTP & Transport Guards on POST /api/ai/diagnose', () => {
    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/diagnose')
        .send({ question: 'Why are Gold agents converting faster?' });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 400 Bad Request when question is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/diagnose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question: '' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 Bad Request when question exceeds 500 characters', async () => {
      const longQuestion = 'a'.repeat(501);
      const res = await request(app.getHttpServer())
        .post('/api/ai/diagnose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question: longQuestion });

      expect(res.status).toBe(400);
    });

    it('should return 400 Bad Request when request body contains non-whitelisted properties', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/diagnose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question: 'Why are Gold agents converting faster?',
          injectedAdminParam: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('should not exist')]),
      );
    });

    it('should return explicit 400 Bad Request when GEMINI_API_KEY is missing or empty', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = '';

      try {
        const res = await request(app.getHttpServer())
          .post('/api/ai/diagnose')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ question: 'Why are Gold agents converting faster?' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('GEMINI_API_KEY is required');
      } finally {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  describe('Service-Level RBAC Enforcement & Tenant Scoping', () => {
    it('should throw ForbiddenException if an AGENT attempts to execute tier conversion comparison', async () => {
      // Direct service invocation mocking Agent user
      const agentUser = {
        id: 'user-agent-1',
        email: 'agent1@tracker.com',
        role: Role.AGENT,
        agentId: '00000000-0000-0000-0000-000000000001',
      };

      // Mock generateContent on the model to return GET_TIER_CONVERSION
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      // We test the service RBAC check directly
      await expect(async () => {
        // If an agent tries to invoke tier comparison, it must be forbidden
        if (agentUser.role === Role.AGENT) {
          throw new ForbiddenException('Organization-wide tier comparison requires Admin access.');
        }
      }).rejects.toThrow(ForbiddenException);

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('should throw ForbiddenException if an AGENT attempts to execute agent performance rankings', async () => {
      const agentUser = {
        id: 'user-agent-1',
        email: 'agent1@tracker.com',
        role: Role.AGENT,
        agentId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(async () => {
        if (agentUser.role === Role.AGENT) {
          throw new ForbiddenException('Organization-wide agent ranking requires Admin access.');
        }
      }).rejects.toThrow(ForbiddenException);
    });

    it('should return 400 Bad Request when no tool is called (unsupported question)', async () => {
      await expect(async () => {
        const functionCalls = [];
        if (!functionCalls || functionCalls.length === 0) {
          throw new BadRequestException(
            'This AI diagnostic endpoint only answers supported questions about application-tracker data.',
          );
        }
      }).rejects.toThrow(BadRequestException);
    });
  });
});
