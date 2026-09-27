import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { parse } from 'csv-parse/sync';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Agent, School, Program, User, Application } from '../entities';
import { AgentTier, ApplicationStage, Role } from '../types/enums';
import { AppDataSource } from '../config/data-source';
import { ensureDatabases } from './ensure-db';

export interface SeedOptions {
  reset?: boolean;
  bcryptRounds?: number;
  sampleDataDir?: string;
  silent?: boolean;
}

// Simple seeded PRNG (Mulberry32) for deterministic synthesis
class SeededRandom {
  private state: number;
  constructor(seed = 42) {
    this.state = seed;
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export async function seedDatabase(
  dataSource: DataSource,
  options: SeedOptions = {},
): Promise<{
  agentsCount: number;
  schoolsCount: number;
  programsCount: number;
  usersCount: number;
  applicationsCount: number;
}> {
  const {
    reset = true,
    bcryptRounds = process.env.NODE_ENV === 'test' ? 4 : 10,
    sampleDataDir = [
      path.resolve(__dirname, '../../sample_seed_data'),
      path.resolve(__dirname, '../../../sample_seed_data'),
      path.resolve(process.cwd(), 'sample_seed_data'),
      path.resolve(process.cwd(), '../sample_seed_data'),
    ].find((p) => fs.existsSync(p)) || path.resolve(__dirname, '../../sample_seed_data'),
    silent = false,
  } = options;

  const log = (msg: string) => {
    if (!silent) console.log(`[Seed] ${msg}`);
  };

  log(`Connecting to database "${dataSource.options.database}"...`);
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    if (reset) {
      log('Resetting schema...');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      await queryRunner.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      await dataSource.synchronize();
    } else {
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    }

    await queryRunner.startTransaction();

    // 1. Ingest Agents (Map CSV ID -> Agent entity with UUID)
    const agentMap = new Map<string, Agent>();
    const agentsCsvPath = path.join(sampleDataDir, 'agents.csv');
    const agentsRaw = fs.readFileSync(agentsCsvPath, 'utf-8');
    const agentsParsed = parse(agentsRaw, { columns: true, skip_empty_lines: true, trim: true });

    const agents: Agent[] = agentsParsed.map((row: any) => {
      const agent = new Agent();
      agent.id = randomUUID();
      agent.name = row.name;
      agent.country = row.country;
      agent.tier = row.tier as AgentTier;
      agentMap.set(row.id, agent);
      return agent;
    });

    await queryRunner.manager.save(Agent, agents);
    log(`Seeded ${agents.length} agents from CSV.`);

    // 2. Ingest Schools (Map CSV ID -> School entity with UUID)
    const schoolMap = new Map<string, School>();
    const schoolsCsvPath = path.join(sampleDataDir, 'schools.csv');
    const schoolsRaw = fs.readFileSync(schoolsCsvPath, 'utf-8');
    const schoolsParsed = parse(schoolsRaw, { columns: true, skip_empty_lines: true, trim: true });

    const schools: School[] = schoolsParsed.map((row: any) => {
      const school = new School();
      school.id = randomUUID();
      school.name = row.name;
      school.country = row.country;
      schoolMap.set(row.id, school);
      return school;
    });

    await queryRunner.manager.save(School, schools);
    log(`Seeded ${schools.length} schools from CSV.`);

    // 3. Ingest Programs (Map CSV ID -> Program entity with UUID and link School UUID)
    const programMap = new Map<string, Program>();
    const programsCsvPath = path.join(sampleDataDir, 'programs.csv');
    const programsRaw = fs.readFileSync(programsCsvPath, 'utf-8');
    const programsParsed = parse(programsRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const programs: Program[] = programsParsed.map((row: any) => {
      const school = schoolMap.get(row.school_id);
      if (!school) {
        throw new Error(
          `Referenced school_id "${row.school_id}" not found for program "${row.id}"`,
        );
      }
      const program = new Program();
      program.id = randomUUID();
      program.schoolId = school.id;
      program.name = row.name;
      program.tuitionUsd = parseInt(row.tuition_usd, 10);
      programMap.set(row.id, program);
      return program;
    });

    await queryRunner.manager.save(Program, programs);
    log(`Seeded ${programs.length} programs from CSV.`);

    // 4. Seed Deterministic Users (Admin + Agents with UUIDs)
    const defaultPasswordHash = await bcrypt.hash('password123', bcryptRounds);
    const users: User[] = [];

    // Admin user
    const adminUser = new User();
    adminUser.id = randomUUID();
    adminUser.email = 'admin@tracker.com';
    adminUser.passwordHash = defaultPasswordHash;
    adminUser.role = Role.ADMIN;
    adminUser.agentId = null;
    users.push(adminUser);

    // Agent users linked to agent UUIDs
    agents.forEach((agent, idx) => {
      const agentUser = new User();
      agentUser.id = randomUUID();
      agentUser.email = `agent${idx + 1}@tracker.com`;
      agentUser.passwordHash = defaultPasswordHash;
      agentUser.role = Role.AGENT;
      agentUser.agentId = agent.id;
      users.push(agentUser);
    });

    await queryRunner.manager.save(User, users);
    log(`Seeded ${users.length} users (1 Admin, ${users.length - 1} Agents).`);

    // 5. Ingest Base Applications from CSV with UUID primary and foreign keys
    const appsCsvPath = path.join(sampleDataDir, 'applications.csv');
    const appsRaw = fs.readFileSync(appsCsvPath, 'utf-8');
    const appsParsed = parse(appsRaw, { columns: true, skip_empty_lines: true, trim: true });

    const baseApplications: Application[] = appsParsed.map((row: any) => {
      const agent = agentMap.get(row.agent_id);
      const program = programMap.get(row.program_id);
      if (!agent || !program) {
        throw new Error(`Missing agent or program mapping for CSV application "${row.id}"`);
      }
      const app = new Application();
      app.id = randomUUID();
      app.studentName = row.student_name;
      app.agentId = agent.id;
      app.programId = program.id;
      app.stage = row.stage as ApplicationStage;
      app.stageEnteredDate = new Date(row.stage_entered_date);
      app.createdDate = new Date(row.created_date);
      app.notes = null;
      return app;
    });

    // 6. Calibrated Deterministic Synthesis (~76 additional applications to reach 226)
    const rng = new SeededRandom(2026);
    const firstNames = [
      'Aarav',
      'Diya',
      'Kavya',
      'Rohan',
      'Ananya',
      'Tariq',
      'Fatima',
      'Kwame',
      'Chioma',
      'Zainab',
      'Chen',
      'Wei',
      'Mei',
      'Hiroshi',
      'Yuki',
      'Thanh',
      'Mateo',
      'Sofia',
      'Lucas',
      'Camila',
      'Elena',
      'Ivan',
      'Dmitri',
      'Olga',
    ];
    const lastNames = [
      'Patel',
      'Sharma',
      'Rao',
      'Kumar',
      'Adeyemi',
      'Okafor',
      'Mensah',
      'Diallo',
      'Al-Mansoor',
      'Haddad',
      'Zhang',
      'Wang',
      'Nguyen',
      'Tran',
      'Tanaka',
      'Sato',
      'Silva',
      'Santos',
      'Gonzalez',
      'Rodriguez',
      'Popov',
      'Ivanov',
    ];

    const agentTierMap = new Map<string, AgentTier>();
    agents.forEach((a) => agentTierMap.set(a.id, a.tier));

    const programIds = programs.map((p) => p.id);
    const goldAgents = agents.filter((a) => a.tier === AgentTier.GOLD).map((a) => a.id);
    const silverAgents = agents.filter((a) => a.tier === AgentTier.SILVER).map((a) => a.id);
    const bronzeAgents = agents.filter((a) => a.tier === AgentTier.BRONZE).map((a) => a.id);

    const syntheticApps: Application[] = [];

    // Helper for generating dates with monotonic guarantee
    const createDates = (
      createdDaysAgo: number,
      dwellDaysInStage: number,
    ): { createdDate: Date; stageEnteredDate: Date } => {
      const now = new Date('2026-05-30T12:00:00Z');
      const createdDate = new Date(now.getTime() - createdDaysAgo * 86400000);
      const stageEnteredDaysAgo = Math.max(0, createdDaysAgo - dwellDaysInStage);
      const stageEnteredDate = new Date(now.getTime() - stageEnteredDaysAgo * 86400000);
      return { createdDate, stageEnteredDate };
    };

    // Synthesize 25 Gold applications (high conversion, low dwell at Offer Received)
    for (let i = 0; i < 25; i++) {
      const agentId = rng.choice(goldAgents);
      const programId = rng.choice(programIds);
      const studentName = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;

      // 70% chance advanced stage (Enrolled, Visa Issued, Visa Applied)
      const isConverted = rng.next() < 0.72;
      const stage = isConverted
        ? rng.choice([
            ApplicationStage.ENROLLED,
            ApplicationStage.VISA_ISSUED,
            ApplicationStage.VISA_APPLIED,
          ])
        : rng.choice([ApplicationStage.OFFER_RECEIVED, ApplicationStage.APPLIED]);

      const dwell =
        stage === ApplicationStage.OFFER_RECEIVED ? rng.nextInt(5, 10) : rng.nextInt(3, 12);
      const createdDaysAgo = rng.nextInt(30, 120);
      const { createdDate, stageEnteredDate } = createDates(createdDaysAgo, dwell);

      const app = new Application();
      app.id = randomUUID();
      app.studentName = studentName;
      app.agentId = agentId;
      app.programId = programId;
      app.stage = stage;
      app.stageEnteredDate = stageEnteredDate;
      app.createdDate = createdDate;
      app.notes = isConverted
        ? 'High merit student. Verified financial docs.'
        : 'Offer under review.';
      syntheticApps.push(app);
    }

    // Synthesize 25 Silver applications (medium conversion, ~14 days dwell)
    for (let i = 0; i < 25; i++) {
      const agentId = rng.choice(silverAgents);
      const programId = rng.choice(programIds);
      const studentName = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;

      const roll = rng.next();
      const stage =
        roll < 0.5
          ? rng.choice([
              ApplicationStage.ENROLLED,
              ApplicationStage.VISA_ISSUED,
              ApplicationStage.ACCEPTED,
            ])
          : roll < 0.85
            ? rng.choice([
                ApplicationStage.OFFER_RECEIVED,
                ApplicationStage.APPLIED,
                ApplicationStage.SHORTLISTED,
              ])
            : ApplicationStage.WITHDRAWN;

      const dwell =
        stage === ApplicationStage.OFFER_RECEIVED ? rng.nextInt(12, 18) : rng.nextInt(6, 20);
      const createdDaysAgo = rng.nextInt(40, 150);
      const { createdDate, stageEnteredDate } = createDates(createdDaysAgo, dwell);

      const app = new Application();
      app.id = randomUUID();
      app.studentName = studentName;
      app.agentId = agentId;
      app.programId = programId;
      app.stage = stage;
      app.stageEnteredDate = stageEnteredDate;
      app.createdDate = createdDate;
      app.notes =
        stage === ApplicationStage.WITHDRAWN ? 'Student opted for local university.' : null;
      syntheticApps.push(app);
    }

    // Synthesize 20 Bronze applications (lower conversion, ~22 days dwell, higher withdrawal)
    for (let i = 0; i < 20; i++) {
      const agentId = rng.choice(bronzeAgents);
      const programId = rng.choice(programIds);
      const studentName = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;

      const roll = rng.next();
      const stage =
        roll < 0.25
          ? rng.choice([ApplicationStage.ENROLLED, ApplicationStage.VISA_ISSUED])
          : roll < 0.6
            ? rng.choice([
                ApplicationStage.OFFER_RECEIVED,
                ApplicationStage.APPLIED,
                ApplicationStage.LEAD,
              ])
            : ApplicationStage.WITHDRAWN;

      const dwell =
        stage === ApplicationStage.OFFER_RECEIVED ? rng.nextInt(19, 28) : rng.nextInt(10, 30);
      const createdDaysAgo = rng.nextInt(40, 180);
      const { createdDate, stageEnteredDate } = createDates(createdDaysAgo, dwell);

      const app = new Application();
      app.id = randomUUID();
      app.studentName = studentName;
      app.agentId = agentId;
      app.programId = programId;
      app.stage = stage;
      app.stageEnteredDate = stageEnteredDate;
      app.createdDate = createdDate;
      app.notes =
        stage === ApplicationStage.WITHDRAWN
          ? 'Financial constraints / sponsor withdrawal.'
          : 'Follow-up needed.';
      syntheticApps.push(app);
    }

    // Synthesize 6 specific bottleneck applications for P008 (MSc Info Systems) & P014 (MBA Finance)
    const bottleneckPrograms = [programMap.get('P008')?.id, programMap.get('P014')?.id].filter(
      Boolean,
    ) as string[];

    for (const progId of bottleneckPrograms) {
      for (let k = 0; k < 3; k++) {
        const agentId = rng.choice(agents.map((a) => a.id));
        const studentName = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;

        const dwell = rng.nextInt(32, 45); // Extended dwell: 32-45 days at Offer Received
        const createdDaysAgo = dwell + rng.nextInt(10, 20);
        const { createdDate, stageEnteredDate } = createDates(createdDaysAgo, dwell);

        const app = new Application();
        app.id = randomUUID();
        app.studentName = studentName;
        app.agentId = agentId;
        app.programId = progId;
        app.stage = ApplicationStage.OFFER_RECEIVED;
        app.stageEnteredDate = stageEnteredDate;
        app.createdDate = createdDate;
        app.notes = 'Awaiting department committee admission decision review.';
        syntheticApps.push(app);
      }
    }

    const allApplications = [...baseApplications, ...syntheticApps];

    // Batch insert applications in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < allApplications.length; i += chunkSize) {
      const chunk = allApplications.slice(i, i + chunkSize);
      await queryRunner.manager.save(Application, chunk);
    }

    log(
      `Seeded ${allApplications.length} total applications (${baseApplications.length} base CSV + ${syntheticApps.length} calibrated synthetic).`,
    );

    await queryRunner.commitTransaction();

    return {
      agentsCount: agents.length,
      schoolsCount: schools.length,
      programsCount: programs.length,
      usersCount: users.length,
      applicationsCount: allApplications.length,
    };
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    log(`Seeding failed: ${error}`);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Allow direct CLI execution: ts-node src/scripts/seed.ts
if (require.main === module) {
  (async () => {
    try {
      await ensureDatabases();
      const result = await seedDatabase(AppDataSource);
      console.log('\n================ SEED SUMMARY ================');
      console.log(`✓ Agents:       ${result.agentsCount}`);
      console.log(`✓ Schools:      ${result.schoolsCount}`);
      console.log(`✓ Programs:     ${result.programsCount}`);
      console.log(`✓ Users:        ${result.usersCount}`);
      console.log(`✓ Applications: ${result.applicationsCount}`);
      console.log('==============================================\n');
      await AppDataSource.destroy();
      process.exit(0);
    } catch (err) {
      console.error('Seed script error:', err);
      process.exit(1);
    }
  })();
}
