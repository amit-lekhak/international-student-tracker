import { Controller, Get, Query, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { ProgramResponseDto } from './dto/program-response.dto';
import { FilterProgramsDto } from './dto/filter-programs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Lookups')
@Controller('api/programs')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('jwt')
@ApiBearerAuth('jwt')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  @ApiOperation({
    summary: 'Get list of programs (optionally filtered by schoolId) for dropdown pickers',
  })
  @ApiResponse({
    status: 200,
    description: 'Alphabetically sorted list of programs',
    type: [ProgramResponseDto],
  })
  async findAll(@Query() filterDto: FilterProgramsDto): Promise<ProgramResponseDto[]> {
    return this.programsService.findAll(filterDto);
  }
}
