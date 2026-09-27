import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { AiToolName } from '../dto/ai-diagnostic-response.dto';
import { ApplicationStage, isApplicationStage } from '../../../types/enums';
import { StageBottleneckArgs, AgentRankingArgs, StageDistributionArgs } from './ai-tool.interface';

export const AI_SYSTEM_PROMPT = `You are the Grounded AI Diagnostic Engine for the International Student Application Tracker.
You diagnose pipeline health, agent performance, program bottlenecks, and conversion velocity using ONLY verified SQL database tools.

CORE OPERATING INSTRUCTIONS:
1. TOOL-FIRST ROUTING: If the question asks about applications, agents, programs, conversion rates, dwell times, or pipeline stages, you MUST invoke the appropriate diagnostic tool.
2. UNSUPPORTED QUESTIONS: If the question is off-domain (e.g., general trivia, weather, coding) or requests information not stored in the application tracker, do NOT call any tool. Return a direct text response declining the request.
3. ABSOLUTE GROUNDING: Use only facts and metrics contained in the current tool result. Never introduce additional numbers, percentages, dates, counts, trends, comparisons, causes, or other claims that are absent from supportingData.
4. CAUSAL DISCLAIMER (MANDATORY FOR "WHY" QUESTIONS):
   - When asked WHY a tier, program, or agent performs differently, describe only the observed differences supported by the tool result (e.g., higher conversion rate, shorter active dwell time).
   - Explicitly distinguish correlation/observed pipeline differences from causation.
   - You MUST include this explicit statement:
     "The database records pipeline metrics and velocity, but does not establish causes that it does not record. It does not track unmeasured variables such as counselor experience, student academic quality, lead sources, communication quality, geography, or school partnerships."
   - Never invent or speculate on unrecorded causes.
5. CONCISE & PROFESSIONAL: Deliver structured, executive-ready prose that directly references the accompanying supporting numbers.`;

export const getTierConversionDeclaration: FunctionDeclaration = {
  name: AiToolName.GET_TIER_CONVERSION,
  description:
    'ADMIN ONLY: Aggregates total applications, enrollment count, conversion rate %, and average days to enrollment grouped by agent tier (Gold, Silver, Bronze).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
    required: [],
  },
};

export const getStageBottlenecksDeclaration: FunctionDeclaration = {
  name: AiToolName.GET_STAGE_BOTTLENECKS,
  description:
    'Identifies programs and application stages with the longest active dwell times (days currently waiting in stage). Excludes enrolled and withdrawn applications by default.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      stage: {
        type: SchemaType.STRING,
        description:
          'Optional specific stage to inspect (e.g. "Offer Received", "Visa Applied", "Applied").',
      },
      programId: {
        type: SchemaType.STRING,
        description: 'Optional program UUID to isolate dwell times for a single program.',
      },
      limit: {
        type: SchemaType.INTEGER,
        description: 'Optional limit of results (1-50, default 10).',
      },
    },
    required: [],
  },
};

export const getAgentRankingsDeclaration: FunctionDeclaration = {
  name: AiToolName.GET_AGENT_RANKINGS,
  description:
    'ADMIN ONLY: Ranks recruiting agencies by successful enrolled students, conversion efficiency, and volume.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      limit: {
        type: SchemaType.INTEGER,
        description: 'Optional limit of ranked agents to return (1-50, default 10).',
      },
    },
    required: [],
  },
};

export const getStageDistributionDeclaration: FunctionDeclaration = {
  name: AiToolName.GET_STAGE_DISTRIBUTION,
  description:
    'Calculates the exact count and percentage breakdown of applications across all 9 pipeline stages (Lead through Enrolled/Withdrawn).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      programId: {
        type: SchemaType.STRING,
        description: 'Optional program UUID to filter stage distribution.',
      },
      agentId: {
        type: SchemaType.STRING,
        description: 'Optional agent UUID (Admin only) to filter stage distribution.',
      },
    },
    required: [],
  },
};

export const ALL_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  getTierConversionDeclaration,
  getStageBottlenecksDeclaration,
  getAgentRankingsDeclaration,
  getStageDistributionDeclaration,
];

export class ToolArgumentSanitizer {
  static sanitizeBottleneckArgs(rawArgs: any): StageBottleneckArgs {
    const args: StageBottleneckArgs = {};
    if (rawArgs?.stage && typeof rawArgs.stage === 'string' && isApplicationStage(rawArgs.stage)) {
      args.stage = rawArgs.stage as ApplicationStage;
    }
    if (
      rawArgs?.programId &&
      typeof rawArgs.programId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawArgs.programId)
    ) {
      args.programId = rawArgs.programId;
    }
    if (rawArgs?.limit !== undefined) {
      const parsed = parseInt(String(rawArgs.limit), 10);
      if (!isNaN(parsed)) {
        args.limit = Math.min(Math.max(parsed, 1), 50);
      }
    }
    return args;
  }

  static sanitizeRankingArgs(rawArgs: any): AgentRankingArgs {
    const args: AgentRankingArgs = {};
    if (rawArgs?.limit !== undefined) {
      const parsed = parseInt(String(rawArgs.limit), 10);
      if (!isNaN(parsed)) {
        args.limit = Math.min(Math.max(parsed, 1), 50);
      }
    }
    return args;
  }

  static sanitizeDistributionArgs(rawArgs: any): StageDistributionArgs {
    const args: StageDistributionArgs = {};
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      rawArgs?.programId &&
      typeof rawArgs.programId === 'string' &&
      uuidRegex.test(rawArgs.programId)
    ) {
      args.programId = rawArgs.programId;
    }
    if (
      rawArgs?.agentId &&
      typeof rawArgs.agentId === 'string' &&
      uuidRegex.test(rawArgs.agentId)
    ) {
      args.agentId = rawArgs.agentId;
    }
    return args;
  }
}
