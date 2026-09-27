import { ApplicationStage } from '../../../types/enums';

export interface TierConversionRow {
  tier: string;
  totalApplications: number;
  enrolledCount: number;
  conversionRatePct: number;
  avgDaysToEnroll: number;
}

export interface StageBottleneckArgs {
  stage?: ApplicationStage;
  programId?: string;
  limit?: number;
}

export interface StageBottleneckRow {
  programName: string;
  schoolName: string;
  stage: string;
  activeApplications: number;
  avgDwellDays: number;
  maxDwellDays: number;
}

export interface AgentRankingArgs {
  limit?: number;
}

export interface AgentRankingRow {
  rank: number;
  agentName: string;
  country: string;
  tier: string;
  totalApplications: number;
  enrolledCount: number;
  conversionRatePct: number;
  avgDaysToEnroll: number;
}

export interface StageDistributionArgs {
  programId?: string;
  agentId?: string;
}

export interface StageDistributionRow {
  stage: string;
  count: number;
  percentageOfTotal: number;
}

export interface ToolExecutionResult {
  toolName: string;
  supportingData: Array<Record<string, any>>;
  sqlQuerySummary: string;
}
