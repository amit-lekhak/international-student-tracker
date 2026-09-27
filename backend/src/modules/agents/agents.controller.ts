import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { AgentResponseDto } from './dto/agent-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Lookups')
@Controller('api/agents')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('jwt')
@ApiBearerAuth('jwt')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  @ApiOperation({ summary: 'Get list of partner agencies for filter pickers' })
  @ApiResponse({
    status: 200,
    description: 'Alphabetically sorted list of agents',
    type: [AgentResponseDto],
  })
  async findAll(): Promise<AgentResponseDto[]> {
    return this.agentsService.findAll();
  }
}
