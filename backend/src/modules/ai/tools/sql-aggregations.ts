import { DataSource } from 'typeorm';
import { ApplicationStage, APPLICATION_STAGES } from '../../../types/enums';
import {
  TierConversionRow,
  StageBottleneckArgs,
  StageBottleneckRow,
  AgentRankingArgs,
  AgentRankingRow,
  StageDistributionArgs,
  StageDistributionRow,
} from './ai-tool.interface';

export class AiSqlAggregations {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * ADMIN ONLY: Compares conversion rate and velocity across Gold, Silver, and Bronze tiers.
   */
  async getTierConversionComparison(): Promise<TierConversionRow[]> {
    const rawRows = await this.dataSource.query(
      `
      SELECT 
        a.tier AS "tier",
        COUNT(app.id)::int AS "totalApplications",
        COUNT(CASE WHEN app.stage = $1 THEN 1 END)::int AS "enrolledCount",
        ROUND(
          COALESCE(
            (COUNT(CASE WHEN app.stage = $1 THEN 1 END)::numeric / NULLIF(COUNT(app.id), 0)) * 100, 
            0
          ), 
          1
        )::float AS "conversionRatePct",
        ROUND(
          COALESCE(
            AVG(
              CASE 
                WHEN app.stage = $1 
                THEN EXTRACT(EPOCH FROM (app."stageEnteredDate" - app."createdDate")) / 86400 
                ELSE NULL 
              END
            ), 
            0
          )::numeric, 
          1
        )::float AS "avgDaysToEnroll"
      FROM agents a
      LEFT JOIN applications app ON app."agentId" = a.id
      GROUP BY a.tier
      ORDER BY 
        CASE 
          WHEN a.tier = 'Gold' THEN 1 
          WHEN a.tier = 'Silver' THEN 2 
          WHEN a.tier = 'Bronze' THEN 3 
          ELSE 4 
        END ASC
      `,
      [ApplicationStage.ENROLLED],
    );

    return rawRows.map((r: any) => ({
      tier: r.tier,
      totalApplications: Number(r.totalApplications) || 0,
      enrolledCount: Number(r.enrolledCount) || 0,
      conversionRatePct: Number(r.conversionRatePct) || 0,
      avgDaysToEnroll: Number(r.avgDaysToEnroll) || 0,
    }));
  }

  /**
   * ADMIN & AGENT (Scoped): Identifies programs and stages with the longest active dwell times.
   */
  async getStageBottlenecksByProgram(
    args: StageBottleneckArgs,
    scopedAgentId?: string,
  ): Promise<StageBottleneckRow[]> {
    const params: any[] = [];
    let paramIdx = 1;

    let query = `
      SELECT 
        p.name AS "programName",
        s.name AS "schoolName",
        app.stage AS "stage",
        COUNT(app.id)::int AS "activeApplications",
        ROUND(
          AVG(EXTRACT(EPOCH FROM (NOW() - app."stageEnteredDate")) / 86400)::numeric, 
          1
        )::float AS "avgDwellDays",
        ROUND(
          MAX(EXTRACT(EPOCH FROM (NOW() - app."stageEnteredDate")) / 86400)::numeric, 
          1
        )::float AS "maxDwellDays"
      FROM applications app
      JOIN programs p ON p.id = app."programId"
      JOIN schools s ON s.id = p."schoolId"
      WHERE 1=1
    `;

    if (scopedAgentId) {
      query += ` AND app."agentId" = $${paramIdx++}`;
      params.push(scopedAgentId);
    }

    if (args.programId) {
      query += ` AND app."programId" = $${paramIdx++}`;
      params.push(args.programId);
    }

    if (args.stage) {
      query += ` AND app.stage = $${paramIdx++}`;
      params.push(args.stage);
    } else {
      // Exclude terminal stages from active bottleneck detection
      query += ` AND app.stage NOT IN ($${paramIdx++}, $${paramIdx++})`;
      params.push(ApplicationStage.ENROLLED, ApplicationStage.WITHDRAWN);
    }

    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
    query += `
      GROUP BY p.name, s.name, app.stage
      ORDER BY "avgDwellDays" DESC, "activeApplications" DESC
      LIMIT $${paramIdx++}
    `;
    params.push(limit);

    const rawRows = await this.dataSource.query(query, params);

    return rawRows.map((r: any) => ({
      programName: r.programName,
      schoolName: r.schoolName,
      stage: r.stage,
      activeApplications: Number(r.activeApplications) || 0,
      avgDwellDays: Number(r.avgDwellDays) || 0,
      maxDwellDays: Number(r.maxDwellDays) || 0,
    }));
  }

  /**
   * ADMIN ONLY: Ranks agencies by volume, enrolled conversions, and velocity.
   */
  async getAgentPerformanceRanking(args: AgentRankingArgs): Promise<AgentRankingRow[]> {
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

    const rawRows = await this.dataSource.query(
      `
      SELECT 
        a.name AS "agentName",
        a.country AS "country",
        a.tier AS "tier",
        COUNT(app.id)::int AS "totalApplications",
        COUNT(CASE WHEN app.stage = $1 THEN 1 END)::int AS "enrolledCount",
        ROUND(
          COALESCE(
            (COUNT(CASE WHEN app.stage = $1 THEN 1 END)::numeric / NULLIF(COUNT(app.id), 0)) * 100, 
            0
          ), 
          1
        )::float AS "conversionRatePct",
        ROUND(
          COALESCE(
            AVG(
              CASE 
                WHEN app.stage = $1 
                THEN EXTRACT(EPOCH FROM (app."stageEnteredDate" - app."createdDate")) / 86400 
                ELSE NULL 
              END
            ), 
            0
          )::numeric, 
          1
        )::float AS "avgDaysToEnroll"
      FROM agents a
      LEFT JOIN applications app ON app."agentId" = a.id
      GROUP BY a.id, a.name, a.country, a.tier
      ORDER BY "enrolledCount" DESC, "conversionRatePct" DESC, "totalApplications" DESC
      LIMIT $2
      `,
      [ApplicationStage.ENROLLED, limit],
    );

    return rawRows.map((r: any, idx: number) => ({
      rank: idx + 1,
      agentName: r.agentName,
      country: r.country,
      tier: r.tier,
      totalApplications: Number(r.totalApplications) || 0,
      enrolledCount: Number(r.enrolledCount) || 0,
      conversionRatePct: Number(r.conversionRatePct) || 0,
      avgDaysToEnroll: Number(r.avgDaysToEnroll) || 0,
    }));
  }

  /**
   * ADMIN & AGENT (Scoped): Returns exact count and percentage across all 9 stages.
   */
  async getApplicationStageDistribution(
    args: StageDistributionArgs,
    scopedAgentId?: string,
  ): Promise<StageDistributionRow[]> {
    const params: any[] = [];
    let paramIdx = 1;

    let query = `
      SELECT 
        app.stage AS "stage",
        COUNT(app.id)::int AS "count"
      FROM applications app
      WHERE 1=1
    `;

    const effectiveAgentId = scopedAgentId || args.agentId;
    if (effectiveAgentId) {
      query += ` AND app."agentId" = $${paramIdx++}`;
      params.push(effectiveAgentId);
    }

    if (args.programId) {
      query += ` AND app."programId" = $${paramIdx++}`;
      params.push(args.programId);
    }

    query += `
      GROUP BY app.stage
    `;

    const rawRows = await this.dataSource.query(query, params);

    const countsByStage = new Map<string, number>();
    let totalCount = 0;

    rawRows.forEach((r: any) => {
      const c = Number(r.count) || 0;
      countsByStage.set(r.stage, c);
      totalCount += c;
    });

    // Populate all canonical stages in orderly sequence
    return APPLICATION_STAGES.map((stage) => {
      const count = countsByStage.get(stage) || 0;
      const percentageOfTotal =
        totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0;
      return {
        stage,
        count,
        percentageOfTotal,
      };
    });
  }
}
