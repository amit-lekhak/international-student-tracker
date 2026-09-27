import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiQueryDto } from './dto/ai-query.dto';
import { AiDiagnosticResponseDto } from './dto/ai-diagnostic-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../types/enums';

@ApiTags('AI Diagnostics')
@Controller('api/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiCookieAuth('jwt')
@ApiBearerAuth('jwt')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('diagnose')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({
    summary: 'Execute a natural language grounded AI diagnostic query',
    description:
      'Converts admissions questions into deterministic PostgreSQL aggregation tool calls. Backed by Google Gemini Flash and optional Langfuse tracing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grounded analytical diagnosis and supporting raw database figures',
    type: AiDiagnosticResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Missing GEMINI_API_KEY, invalid input, or unsupported off-domain question',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthenticated — valid JWT required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — Agent attempting to access organization-wide metrics',
  })
  async diagnose(
    @Body() dto: AiQueryDto,
    @CurrentUser() user: any,
  ): Promise<AiDiagnosticResponseDto> {
    return this.aiService.diagnose(dto, {
      id: user.id || user.sub,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    });
  }
}
