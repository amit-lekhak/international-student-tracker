import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ApplicationStage } from '../src/types/enums';

describe('RBAC & Applications Scoping (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let agent1Token: string;
  let agent2Token: string;
  let agent1Id: string;
  let agent2Id: string;
  let agent1AppId: string;
  let agent2AppId: string;
  let sampleProgramId: string;

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

    const dataSource = app.get<DataSource>(DataSource);
    const { seedDatabase } = await import('../src/scripts/seed');
    await seedDatabase(dataSource, { reset: true, silent: true });

    // 1. Authenticate Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@tracker.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    // 2. Authenticate Agent 1
    const agent1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent1@tracker.com', password: 'password123' });
    agent1Token = agent1Login.body.accessToken;
    agent1Id = agent1Login.body.user.agentId;

    // 3. Authenticate Agent 2
    const agent2Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent2@tracker.com', password: 'password123' });
    agent2Token = agent2Login.body.accessToken;
    agent2Id = agent2Login.body.user.agentId;

    // Fetch sample program ID
    const programsRes = await request(app.getHttpServer())
      .get('/api/programs')
      .set('Authorization', `Bearer ${adminToken}`);
    sampleProgramId = programsRes.body[0].id;

    // Fetch an application owned by Agent 1
    const agent1Apps = await request(app.getHttpServer())
      .get('/api/applications')
      .set('Authorization', `Bearer ${agent1Token}`);
    agent1AppId = agent1Apps.body.items[0].id;

    // Fetch an application owned by Agent 2
    const agent2Apps = await request(app.getHttpServer())
      .get('/api/applications')
      .set('Authorization', `Bearer ${agent2Token}`);
    agent2AppId = agent2Apps.body.items[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global Admin Access vs. Tenant Isolation', () => {
    it('Admin can view all 226 applications across all agencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications?limit=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.total).toBe(226);
      expect(response.body.items.length).toBe(100);
    });

    it('Agent 1 can only see their own applications and never see Agent 2 records', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications?limit=100')
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(200);

      expect(response.body.meta.total).toBeGreaterThan(0);
      expect(response.body.meta.total).toBeLessThan(226);

      // Verify every returned application belongs exclusively to Agent 1
      for (const item of response.body.items) {
        expect(item.agentId).toBe(agent1Id);
      }
    });

    it('Agent 1 cannot bypass scoping by supplying agentId query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications?agentId=${agent2Id}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(200);

      // Must still return only Agent 1's applications (agentId query is overridden/locked)
      for (const item of response.body.items) {
        expect(item.agentId).toBe(agent1Id);
      }
    });
  });

  describe('IDOR (Insecure Direct Object Reference) Protection', () => {
    it('Agent 1 can view details of their own application', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${agent1AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(200);

      expect(response.body.id).toBe(agent1AppId);
      expect(response.body.agentId).toBe(agent1Id);
      expect(response.body).toHaveProperty('program');
      expect(response.body).toHaveProperty('agent');
    });

    it('Agent 1 is forbidden from viewing an application owned by Agent 2 (IDOR Prevention)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${agent2AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(403);

      expect(response.body.message).toMatch(/permission/i);
    });

    it('Agent 1 is forbidden from updating an application owned by Agent 2', async () => {
      await request(app.getHttpServer())
        .patch(`/api/applications/${agent2AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({ studentName: 'Hacked Name' })
        .expect(403);
    });

    it('Agent 1 is forbidden from editing notes on an application owned by Agent 2', async () => {
      await request(app.getHttpServer())
        .patch(`/api/applications/${agent2AppId}/notes`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({ notes: 'Malicious notes injection' })
        .expect(403);
    });
  });

  describe('Notes Management & Auto-Save', () => {
    it('Agent 1 can update notes on their own application and verify persistence', async () => {
      const testNote = `Counselor follow-up call at ${new Date().toISOString()}`;

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/applications/${agent1AppId}/notes`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({ notes: testNote })
        .expect(200);

      expect(patchRes.body.notes).toBe(testNote);

      // Verify persistence via GET
      const getRes = await request(app.getHttpServer())
        .get(`/api/applications/${agent1AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(200);

      expect(getRes.body.notes).toBe(testNote);
    });
  });

  describe('Stage Transitions & Timestamp Automation', () => {
    it('updating stage updates stageEnteredDate timestamp automatically', async () => {
      const beforeApp = await request(app.getHttpServer())
        .get(`/api/applications/${agent1AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`);

      const originalStageEnteredDate = new Date(beforeApp.body.stageEnteredDate).getTime();

      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${agent1AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({ stage: ApplicationStage.VISA_APPLIED })
        .expect(200);

      expect(response.body.stage).toBe(ApplicationStage.VISA_APPLIED);
      const newStageEnteredDate = new Date(response.body.stageEnteredDate).getTime();
      expect(newStageEnteredDate).toBeGreaterThanOrEqual(originalStageEnteredDate);
    });
  });

  describe('Application Creation with Role Scoping & Validation', () => {
    it('Agent creating an application automatically attributes it to the authenticated agentId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({
          studentName: 'Priya Patel',
          programId: sampleProgramId,
          stage: ApplicationStage.LEAD,
          notes: 'New walk-in student inquiry.',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.studentName).toBe('Priya Patel');
      expect(response.body.agentId).toBe(agent1Id);
      expect(response.body.stage).toBe(ApplicationStage.LEAD);
      expect(response.body.stageEnteredDate).toBeDefined();
    });

    it('Admin creating an application with explicit agentId succeeds', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Vikram Mehta',
          programId: sampleProgramId,
          agentId: agent2Id,
          stage: ApplicationStage.SHORTLISTED,
        })
        .expect(201);

      expect(response.body.studentName).toBe('Vikram Mehta');
      expect(response.body.agentId).toBe(agent2Id);
    });

    it('Admin creating an application without agentId is rejected with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Missing Agent Student',
          programId: sampleProgramId,
        })
        .expect(400);
    });

    it('creating an application with non-existent programId returns 404', async () => {
      const nonExistentProgramId = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Invalid Program Student',
          programId: nonExistentProgramId,
          agentId: agent1Id,
        })
        .expect(404);
    });

    it('Admin creating an application with non-existent agentId returns 404', async () => {
      const nonExistentAgentId = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Invalid Agent Student',
          programId: sampleProgramId,
          agentId: nonExistentAgentId,
        })
        .expect(404);
    });

    it('rejects creating an application with invalid stage enum with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Invalid Stage Student',
          programId: sampleProgramId,
          agentId: agent1Id,
          stage: 'NON_EXISTENT_STAGE',
        })
        .expect(400);
    });

    it('rejects creating an application with blank student name with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'A', // less than 2 chars
          programId: sampleProgramId,
          agentId: agent1Id,
        })
        .expect(400);
    });
  });

  describe('Non-Existent & Invalid Parameter Edge Cases', () => {
    const nonExistentAppId = '00000000-0000-4000-8000-000000000000';

    it('GET /api/applications/:id with non-existent UUID returns 404 Not Found', async () => {
      await request(app.getHttpServer())
        .get(`/api/applications/${nonExistentAppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('PATCH /api/applications/:id with non-existent UUID returns 404 Not Found', async () => {
      await request(app.getHttpServer())
        .patch(`/api/applications/${nonExistentAppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentName: 'New Name' })
        .expect(404);
    });

    it('GET /api/applications/:id with invalid UUID string format returns 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/applications/invalid-uuid-string')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('PATCH /api/applications/:id with invalid UUID string format returns 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch('/api/applications/invalid-uuid-string')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentName: 'New Name' })
        .expect(400);
    });

    it('DELETE /api/applications/:id with non-existent UUID returns 404 Not Found', async () => {
      await request(app.getHttpServer())
        .delete(`/api/applications/${nonExistentAppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Role-Based Deletion Guards', () => {
    it('Agent is strictly forbidden from deleting applications (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/applications/${agent1AppId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(403);
    });

    it('Admin can delete applications', async () => {
      // Create a temporary application to delete
      const createRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentName: 'Temp Student To Delete',
          programId: sampleProgramId,
          agentId: agent1Id,
        });

      const tempId = createRes.body.id;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/applications/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteRes.body.message).toMatch(/deleted successfully/i);

      // Verify it no longer exists
      await request(app.getHttpServer())
        .get(`/api/applications/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Filtering, Search & Pagination Edge Cases', () => {
    it('filters applications by stage', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications?stage=${ApplicationStage.OFFER_RECEIVED}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const item of response.body.items) {
        expect(item.stage).toBe(ApplicationStage.OFFER_RECEIVED);
      }
    });

    it('searches applications by student name (case-insensitive)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications?search=priya')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      for (const item of response.body.items) {
        expect(item.studentName.toLowerCase()).toContain('priya');
      }
    });

    it('returns empty items array with valid metadata when page is out of bounds', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications?page=999&limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.meta.page).toBe(999);
      expect(response.body.meta.total).toBeGreaterThan(0);
      expect(response.body.meta.totalPages).toBeGreaterThan(0);
    });

    it('rejects limit exceeding maximum (limit=500) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/applications?limit=500')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('rejects non-positive page (page=0) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/applications?page=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
