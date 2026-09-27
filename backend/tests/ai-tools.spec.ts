import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/config/data-source';
import { AiSqlAggregations } from '../src/modules/ai/tools/sql-aggregations';
import { ToolArgumentSanitizer } from '../src/modules/ai/tools/tool-registry';
import { ApplicationStage, APPLICATION_STAGES } from '../src/types/enums';

describe('AI SQL Aggregations & Tool Argument Sanitizer (Deterministic Tests)', () => {
  let dataSource: DataSource;
  let sqlAggregations: AiSqlAggregations;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    dataSource = AppDataSource;
    sqlAggregations = new AiSqlAggregations(dataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Tool 1: getTierConversionComparison()', () => {
    it('should aggregate conversion metrics across Gold, Silver, and Bronze tiers with statistical validity', async () => {
      const results = await sqlAggregations.getTierConversionComparison();

      expect(results.length).toBeGreaterThanOrEqual(3);

      const gold = results.find((r) => r.tier === 'Gold');
      const silver = results.find((r) => r.tier === 'Silver');
      const bronze = results.find((r) => r.tier === 'Bronze');

      expect(gold).toBeDefined();
      expect(silver).toBeDefined();
      expect(bronze).toBeDefined();

      // Verify Gold > Silver and Gold > Bronze conversion rate
      expect(gold!.conversionRatePct).toBeGreaterThan(silver!.conversionRatePct);
      expect(gold!.conversionRatePct).toBeGreaterThan(bronze!.conversionRatePct);

      // Verify Gold converts faster (fewer avg days to enroll) than Silver and Bronze
      expect(gold!.avgDaysToEnroll).toBeLessThan(silver!.avgDaysToEnroll);
      expect(gold!.avgDaysToEnroll).toBeLessThan(bronze!.avgDaysToEnroll);

      // Total applications sum across all tiers
      const totalSum = results.reduce((acc, r) => acc + r.totalApplications, 0);
      expect(totalSum).toBe(226);
    });
  });

  describe('Tool 2: getStageBottlenecksByProgram()', () => {
    it('should identify programs with longest active dwell times and exclude terminal stages', async () => {
      const results = await sqlAggregations.getStageBottlenecksByProgram({});

      expect(results.length).toBeGreaterThan(0);

      // Ensure no terminal stages (Enrolled or Withdrawn) are returned in active bottleneck list
      const terminalStages = results.filter(
        (r) => r.stage === ApplicationStage.ENROLLED || r.stage === ApplicationStage.WITHDRAWN,
      );
      expect(terminalStages.length).toBe(0);

      // Top bottleneck should have significant dwell days (> 20 days)
      const topBottleneck = results[0];
      expect(topBottleneck.avgDwellDays).toBeGreaterThan(20);

      // Check that seeded bottleneck programs are detected
      const hasSeededBottleneck = results.some(
        (r) =>
          r.programName.includes('Information Systems') ||
          r.programName.includes('Finance') ||
          r.stage === ApplicationStage.OFFER_RECEIVED,
      );
      expect(hasSeededBottleneck).toBe(true);
    });

    it('should filter by specific stage when stage argument is provided', async () => {
      const results = await sqlAggregations.getStageBottlenecksByProgram({
        stage: ApplicationStage.OFFER_RECEIVED,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.stage).toBe(ApplicationStage.OFFER_RECEIVED);
      });
    });

    it('should scope dwell results to a single agent when scopedAgentId is supplied', async () => {
      // Find an agent
      const agent = await dataSource.query(`SELECT id FROM agents LIMIT 1`);
      const agentId = agent[0].id;

      const results = await sqlAggregations.getStageBottlenecksByProgram({}, agentId);

      // Total active applications across this agent's bottlenecks should not exceed agent total
      const agentTotalApps = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM applications WHERE "agentId" = $1`,
        [agentId],
      );

      const activeInResults = results.reduce((acc, r) => acc + r.activeApplications, 0);
      expect(activeInResults).toBeLessThanOrEqual(agentTotalApps[0].count);
    });
  });

  describe('Tool 3: getAgentPerformanceRanking()', () => {
    it('should rank agencies by enrolledCount DESC and conversionRatePct DESC', async () => {
      const results = await sqlAggregations.getAgentPerformanceRanking({ limit: 10 });

      expect(results.length).toBeLessThanOrEqual(10);
      expect(results.length).toBeGreaterThan(0);

      // Sequential ranking
      results.forEach((r, idx) => {
        expect(r.rank).toBe(idx + 1);
        expect(r.agentName).toBeDefined();
        expect(r.tier).toBeDefined();
      });

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        if (current.enrolledCount === next.enrolledCount) {
          expect(current.conversionRatePct).toBeGreaterThanOrEqual(next.conversionRatePct);
        } else {
          expect(current.enrolledCount).toBeGreaterThan(next.enrolledCount);
        }
      }
    });
  });

  describe('Tool 4: getApplicationStageDistribution()', () => {
    it('should return all 9 canonical stages with percentages summing to 100%', async () => {
      const results = await sqlAggregations.getApplicationStageDistribution({});

      expect(results.length).toBe(APPLICATION_STAGES.length);

      const totalCount = results.reduce((acc, r) => acc + r.count, 0);
      expect(totalCount).toBe(226);

      const totalPct = results.reduce((acc, r) => acc + r.percentageOfTotal, 0);
      expect(totalPct).toBeGreaterThanOrEqual(99.5);
      expect(totalPct).toBeLessThanOrEqual(100.5);
    });

    it('should scope stage distribution strictly when scopedAgentId is supplied', async () => {
      const agent = await dataSource.query(`SELECT id FROM agents LIMIT 1`);
      const agentId = agent[0].id;

      const agentApps = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM applications WHERE "agentId" = $1`,
        [agentId],
      );

      const results = await sqlAggregations.getApplicationStageDistribution({}, agentId);

      const sumScoped = results.reduce((acc, r) => acc + r.count, 0);
      expect(sumScoped).toBe(agentApps[0].count);
    });

    it('should allow Admin to filter stage distribution by specific agentId in args', async () => {
      const agent = await dataSource.query(`SELECT id FROM agents LIMIT 1`);
      const agentId = agent[0].id;

      const agentApps = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM applications WHERE "agentId" = $1`,
        [agentId],
      );

      const results = await sqlAggregations.getApplicationStageDistribution({ agentId });

      const sumFiltered = results.reduce((acc, r) => acc + r.count, 0);
      expect(sumFiltered).toBe(agentApps[0].count);
    });
  });

  describe('ToolArgumentSanitizer', () => {
    it('should sanitize bottleneck arguments and clamp limits', () => {
      const raw1 = { stage: 'Offer Received', limit: 100, programId: 'not-a-uuid' };
      const res1 = ToolArgumentSanitizer.sanitizeBottleneckArgs(raw1);
      expect(res1.stage).toBe(ApplicationStage.OFFER_RECEIVED);
      expect(res1.limit).toBe(50); // Clamped to 50
      expect(res1.programId).toBeUndefined(); // Rejected invalid UUID

      const raw2 = { stage: 'InvalidStage', limit: -5 };
      const res2 = ToolArgumentSanitizer.sanitizeBottleneckArgs(raw2);
      expect(res2.stage).toBeUndefined();
      expect(res2.limit).toBe(1); // Clamped to 1
    });

    it('should sanitize ranking arguments', () => {
      const res = ToolArgumentSanitizer.sanitizeRankingArgs({ limit: '25' });
      expect(res.limit).toBe(25);
    });

    it('should sanitize distribution arguments with valid program and agent UUIDs', () => {
      const validProgramUuid = '12345678-1234-1234-1234-123456789abc';
      const validAgentUuid = '87654321-4321-4321-4321-cba987654321';
      const res = ToolArgumentSanitizer.sanitizeDistributionArgs({
        programId: validProgramUuid,
        agentId: validAgentUuid,
      });
      expect(res.programId).toBe(validProgramUuid);
      expect(res.agentId).toBe(validAgentUuid);
    });
  });
});
