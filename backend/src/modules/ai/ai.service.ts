import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiQueryDto } from './dto/ai-query.dto';
import { AiDiagnosticResponseDto, AiToolName } from './dto/ai-diagnostic-response.dto';
import { Role } from '../../types/enums';
import { AiSqlAggregations } from './tools/sql-aggregations';
import {
  getToolDeclarationsForRole,
  AI_SYSTEM_PROMPT,
  ToolArgumentSanitizer,
  UNSUPPORTED_QUERY_SENTINEL,
} from './tools/tool-registry';

export interface AuthenticatedUserContext {
  id: string;
  email: string;
  role: Role;
  agentId?: string | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly sqlAggregations: AiSqlAggregations;
  private langfuseClient: any = null;

  constructor(private readonly dataSource: DataSource) {
    this.sqlAggregations = new AiSqlAggregations(dataSource);
    this.initLangfuse();
  }

  private initLangfuse(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

    if (publicKey && secretKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Langfuse } = require('langfuse');
        this.langfuseClient = new Langfuse({
          publicKey,
          secretKey,
          baseUrl: host,
        });
        this.logger.log('Langfuse observability initialized successfully.');
      } catch (err) {
        this.logger.warn(`Failed to initialize Langfuse: ${err}`);
        this.langfuseClient = null;
      }
    }
  }

  async diagnose(
    dto: AiQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<AiDiagnosticResponseDto> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Strict API Key Guard
    if (!apiKey || apiKey.trim() === '') {
      throw new BadRequestException(
        'GEMINI_API_KEY is required for AI diagnostic queries. Please set GEMINI_API_KEY in backend/.env.',
      );
    }

    // 2. Langfuse Trace Initialization (Non-blocking)
    let langfuseTrace: any = null;
    let traceId: string | undefined = undefined;

    if (this.langfuseClient) {
      try {
        langfuseTrace = this.langfuseClient.trace({
          name: 'ai-diagnostic-session',
          input: { question: dto.question, userRole: user.role },
          metadata: { userId: user.id },
        });
        traceId = langfuseTrace.id;
      } catch (err) {
        this.logger.warn(`Langfuse trace start error: ${err}`);
      }
    }

    try {
      // 3. Initialize Google Gemini Flash model with role-scoped tools
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      const roleTools = getToolDeclarationsForRole(user.role);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: roleTools }],
        systemInstruction: AI_SYSTEM_PROMPT,
      });

      // 4. Turn 1: Model Tool-Routing Turn
      const turn1Result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: dto.question }] }],
      });

      const functionCalls = turn1Result.response.functionCalls();
      let responseText = '';
      try {
        responseText = turn1Result.response.text().trim();
      } catch {
        // Function calls may not contain text
      }

      // 5. If no tool is selected or sentinel is returned (unsupported / off-domain question), return 400 Bad Request
      if (
        !functionCalls ||
        functionCalls.length === 0 ||
        responseText === UNSUPPORTED_QUERY_SENTINEL ||
        responseText.includes(UNSUPPORTED_QUERY_SENTINEL)
      ) {
        if (langfuseTrace) {
          try {
            langfuseTrace.update({
              output: 'Rejected: Unsupported or off-domain question.',
              level: 'WARNING',
            });
            await this.langfuseClient?.flushAsync();
          } catch {
            // Ignore observability flush errors
          }
        }
        throw new BadRequestException(
          'This AI diagnostic endpoint only answers supported questions about application-tracker data.',
        );
      }

      const call = functionCalls[0];
      const toolName = call.name as AiToolName;
      const modelTurnParts = turn1Result.response.candidates?.[0]?.content?.parts || [
        { functionCall: call },
      ];

      // 6. Validate Tool Name
      if (!Object.values(AiToolName).includes(toolName)) {
        throw new BadRequestException(`Unsupported diagnostic tool: ${call.name}`);
      }

      // 7. Enforce RBAC & Scoping
      const isAgent = user.role === Role.AGENT;
      const scopedAgentId = isAgent ? user.agentId || undefined : undefined;

      if (isAgent && toolName === AiToolName.GET_TIER_CONVERSION) {
        throw new ForbiddenException('Organization-wide tier comparison requires Admin access.');
      }

      if (isAgent && toolName === AiToolName.GET_AGENT_RANKINGS) {
        throw new ForbiddenException('Organization-wide agent ranking requires Admin access.');
      }

      // 8. Execute Tool with Sanitized Arguments & Deterministic SQL
      let supportingData: Array<Record<string, any>> = [];
      let sqlQuerySummary = '';

      switch (toolName) {
        case AiToolName.GET_TIER_CONVERSION: {
          supportingData = await this.sqlAggregations.getTierConversionComparison();
          sqlQuerySummary =
            'Aggregated total applications, enrolled count, conversion rate %, and average days to enrollment grouped by agent tier.';
          break;
        }

        case AiToolName.GET_STAGE_BOTTLENECKS: {
          const sanitizedArgs = ToolArgumentSanitizer.sanitizeBottleneckArgs(call.args);
          supportingData = await this.sqlAggregations.getStageBottlenecksByProgram(
            sanitizedArgs,
            scopedAgentId,
          );
          sqlQuerySummary = `Calculated active dwell times (NOW() - stageEnteredDate) per program and stage${
            scopedAgentId ? ' (scoped to your agency)' : ''
          }. Excluded terminal stages (Enrolled, Withdrawn).`;
          break;
        }

        case AiToolName.GET_AGENT_RANKINGS: {
          const sanitizedArgs = ToolArgumentSanitizer.sanitizeRankingArgs(call.args);
          supportingData = await this.sqlAggregations.getAgentPerformanceRanking(sanitizedArgs);
          sqlQuerySummary =
            'Ranked agencies by successful enrolled students and conversion efficiency.';
          break;
        }

        case AiToolName.GET_STAGE_DISTRIBUTION: {
          const sanitizedArgs = ToolArgumentSanitizer.sanitizeDistributionArgs(call.args);
          supportingData = await this.sqlAggregations.getApplicationStageDistribution(
            sanitizedArgs,
            scopedAgentId,
          );
          sqlQuerySummary = `Calculated count and percentage breakdown across all 9 application stages${
            scopedAgentId ? ' (scoped to your agency)' : ''
          }.`;
          break;
        }
      }

      // 9. Turn 2: Send Tool Response to Model for Grounded Prose Generation
      const turn2Result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: dto.question }] },
          { role: 'model', parts: modelTurnParts },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { data: supportingData },
                },
              },
            ],
          },
        ],
      });

      const prose = turn2Result.response.text();
      const executionTimeMs = Date.now() - startTime;

      // 10. Record Langfuse Observability Metrics
      if (langfuseTrace) {
        try {
          const usage = turn2Result.response.usageMetadata;
          langfuseTrace.generation({
            name: 'gemini-diagnostic-response',
            model: modelName,
            input: { question: dto.question, tool: toolName, args: call.args },
            output: prose,
            usage: {
              promptTokens: usage?.promptTokenCount,
              completionTokens: usage?.candidatesTokenCount,
              totalTokens: usage?.totalTokenCount,
            },
            endTime: new Date(),
          });
          await this.langfuseClient?.flushAsync();
        } catch (err) {
          this.logger.warn(`Langfuse generation log error: ${err}`);
        }
      }

      return {
        prose,
        toolName,
        supportingData,
        sqlQuerySummary,
        executionTimeMs,
        traceId,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Map upstream Google Gemini rate limits (429) cleanly
      if (error?.status === 429 || error?.message?.includes('429 Too Many Requests')) {
        throw new HttpException(
          'AI diagnostic rate limit exceeded. Please retry in a moment.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Map upstream service outages (503 / 504)
      if (
        error?.status === 503 ||
        error?.status === 504 ||
        error?.message?.includes('503 Service Unavailable')
      ) {
        throw new BadGatewayException(
          'Upstream AI service is temporarily unavailable. Please retry in a moment.',
        );
      }

      this.logger.error(`AI diagnostic execution error: ${error?.message || error}`);
      throw error;
    }
  }
}
