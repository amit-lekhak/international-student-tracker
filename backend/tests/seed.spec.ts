import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TestDataSource } from '../src/config/data-source';
import { ensureDatabases } from '../src/scripts/ensure-db';
import { seedDatabase } from '../src/scripts/seed';
import { Agent, School, Program, User, Application } from '../src/entities';
import { AgentTier, ApplicationStage, Role, APPLICATION_STAGES } from '../src/types/enums';

describe('Phase 1: Seed Engine & PostgreSQL Schema Verification', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Ensure test database exists
    await ensureDatabases();

    dataSource = TestDataSource;
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    // Run seed against test database with fast bcrypt
    await seedDatabase(dataSource, {
      reset: true,
      bcryptRounds: 4,
      silent: true,
    });
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Entity Count & Baseline Integrity', () => {
    it('should seed exactly 12 agents', async () => {
      const agentRepo = dataSource.getRepository(Agent);
      const count = await agentRepo.count();
      expect(count).toBe(12);

      const goldCount = await agentRepo.count({ where: { tier: AgentTier.GOLD } });
      const silverCount = await agentRepo.count({ where: { tier: AgentTier.SILVER } });
      const bronzeCount = await agentRepo.count({ where: { tier: AgentTier.BRONZE } });

      expect(goldCount).toBe(4);
      expect(silverCount).toBe(4);
      expect(bronzeCount).toBe(4);
    });

    it('should seed exactly 8 schools and 16 programs', async () => {
      const schoolRepo = dataSource.getRepository(School);
      const programRepo = dataSource.getRepository(Program);

      const schoolCount = await schoolRepo.count();
      const programCount = await programRepo.count();

      expect(schoolCount).toBe(8);
      expect(programCount).toBe(16);
    });

    it('should seed 13 deterministic users (1 Admin + 12 Agents) with valid password hashes', async () => {
      const userRepo = dataSource.getRepository(User);
      const count = await userRepo.count();
      expect(count).toBe(13);

      const admin = await userRepo
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email: 'admin@tracker.com' })
        .getOne();

      expect(admin).toBeDefined();
      expect(admin?.role).toBe(Role.ADMIN);
      expect(admin?.agentId).toBeNull();
      expect(admin?.passwordHash).toBeDefined();

      const isPasswordValid = await bcrypt.compare('password123', admin!.passwordHash);
      expect(isPasswordValid).toBe(true);

      const agent1 = await userRepo.findOne({ where: { email: 'agent1@tracker.com' } });
      expect(agent1).toBeDefined();
      expect(agent1?.role).toBe(Role.AGENT);
      expect(agent1?.agentId).toBeDefined();

      const linkedAgent = await dataSource.getRepository(Agent).findOne({
        where: { id: agent1!.agentId as string },
      });
      expect(linkedAgent).toBeDefined();
    });

    it('should seed at least 220 applications with verified schema', async () => {
      const appRepo = dataSource.getRepository(Application);
      const count = await appRepo.count();
      expect(count).toBeGreaterThanOrEqual(220);
    });
  });

  describe('2. Referential Integrity & Foreign Key Relations', () => {
    it('every program should belong to a valid school', async () => {
      const programRepo = dataSource.getRepository(Program);
      const schoolRepo = dataSource.getRepository(School);

      const programs = await programRepo.find();
      const schoolIds = new Set((await schoolRepo.find()).map((s) => s.id));

      for (const prog of programs) {
        expect(schoolIds.has(prog.schoolId)).toBe(true);
      }
    });

    it('every application should link to a valid agent and program', async () => {
      const appRepo = dataSource.getRepository(Application);
      const agentRepo = dataSource.getRepository(Agent);
      const programRepo = dataSource.getRepository(Program);

      const apps = await appRepo.find();
      const agentIds = new Set((await agentRepo.find()).map((a) => a.id));
      const programIds = new Set((await programRepo.find()).map((p) => p.id));

      for (const app of apps) {
        expect(agentIds.has(app.agentId)).toBe(true);
        expect(programIds.has(app.programId)).toBe(true);
      }
    });
  });

  describe('3. Date Monotonicity & Stage Enum Validation', () => {
    it('every application must satisfy stageEnteredDate >= createdDate', async () => {
      const appRepo = dataSource.getRepository(Application);
      const apps = await appRepo.find();

      for (const app of apps) {
        const stageEntered = new Date(app.stageEnteredDate).getTime();
        const created = new Date(app.createdDate).getTime();
        expect(stageEntered).toBeGreaterThanOrEqual(created);
      }
    });

    it('every application stage must be a valid recognized ApplicationStage enum', async () => {
      const appRepo = dataSource.getRepository(Application);
      const apps = await appRepo.find();

      for (const app of apps) {
        expect(APPLICATION_STAGES).toContain(app.stage);
      }
    });
  });

  describe('4. Statistical Calibration for Grounded AI Diagnostics', () => {
    it('Gold-tier agents should exhibit higher conversion velocity than Bronze-tier agents', async () => {
      const appRepo = dataSource.getRepository(Application);
      const agentRepo = dataSource.getRepository(Agent);

      const agents = await agentRepo.find();
      const apps = await appRepo.find();

      const tierMap = new Map<string, AgentTier>();
      agents.forEach((a) => tierMap.set(a.id, a.tier));

      const stats = {
        [AgentTier.GOLD]: { total: 0, converted: 0 },
        [AgentTier.SILVER]: { total: 0, converted: 0 },
        [AgentTier.BRONZE]: { total: 0, converted: 0 },
      };

      const convertedStages = new Set([
        ApplicationStage.ENROLLED,
        ApplicationStage.VISA_ISSUED,
        ApplicationStage.VISA_APPLIED,
      ]);

      for (const app of apps) {
        const tier = tierMap.get(app.agentId);
        if (tier) {
          stats[tier].total++;
          if (convertedStages.has(app.stage)) {
            stats[tier].converted++;
          }
        }
      }

      const goldRate = stats[AgentTier.GOLD].converted / stats[AgentTier.GOLD].total;
      const silverRate = stats[AgentTier.SILVER].converted / stats[AgentTier.SILVER].total;
      const bronzeRate = stats[AgentTier.BRONZE].converted / stats[AgentTier.BRONZE].total;

      expect(goldRate).toBeGreaterThan(silverRate);
      expect(silverRate).toBeGreaterThan(bronzeRate);
      expect(goldRate).toBeGreaterThan(0.45);
    });

    it('Bottleneck programs (MSc Information Systems and MBA Finance) should exhibit prolonged dwell times at Offer Received', async () => {
      const appRepo = dataSource.getRepository(Application);
      const programRepo = dataSource.getRepository(Program);

      const bottleneckProgs = await programRepo.find({
        where: [{ name: 'MSc Information Systems' }, { name: 'MBA Finance' }],
      });
      const bottleneckProgIds = new Set(bottleneckProgs.map((p) => p.id));

      const offerApps = await appRepo.find({
        where: { stage: ApplicationStage.OFFER_RECEIVED },
      });

      const bottleneckDwells: number[] = [];
      const standardDwells: number[] = [];

      for (const app of offerApps) {
        const dwellDays =
          (new Date(app.stageEnteredDate).getTime() - new Date(app.createdDate).getTime()) /
          86400000;

        if (bottleneckProgIds.has(app.programId)) {
          bottleneckDwells.push(dwellDays);
        } else {
          standardDwells.push(dwellDays);
        }
      }

      expect(bottleneckDwells.length).toBeGreaterThan(0);
      const avgBottleneckDwell =
        bottleneckDwells.reduce((a, b) => a + b, 0) / bottleneckDwells.length;

      expect(avgBottleneckDwell).toBeGreaterThan(20);
    });
  });

  describe('5. Database Constraints & Negative Integrity Guarantees', () => {
    it('should reject inserting duplicate user email with unique violation', async () => {
      const userRepo = dataSource.getRepository(User);
      const duplicateUser = userRepo.create({
        email: 'admin@tracker.com',
        passwordHash: 'dummy',
        role: Role.ADMIN,
      });

      await expect(userRepo.save(duplicateUser)).rejects.toThrow();
    });

    it('should reject inserting program with negative tuition due to check constraint', async () => {
      const programRepo = dataSource.getRepository(Program);
      const schoolRepo = dataSource.getRepository(School);
      const school = await schoolRepo.findOneOrFail({ where: {} });

      const invalidProg = programRepo.create({
        name: 'Invalid Negative Tuition Program',
        tuitionUsd: -5000,
        schoolId: school.id,
      });

      await expect(programRepo.save(invalidProg)).rejects.toThrow();
    });

    it('should reject creating application with non-existent foreign key', async () => {
      const appRepo = dataSource.getRepository(Application);
      const programRepo = dataSource.getRepository(Program);
      const program = await programRepo.findOneOrFail({ where: {} });

      const invalidApp = appRepo.create({
        studentName: 'Ghost Student',
        agentId: '00000000-0000-0000-0000-000000000000',
        programId: program.id,
        stage: ApplicationStage.LEAD,
        stageEnteredDate: new Date(),
        createdDate: new Date(),
      });

      await expect(appRepo.save(invalidApp)).rejects.toThrow();
    });
  });
});
