import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { SchoolResponseDto } from './dto/school-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Lookups')
@Controller('api/schools')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('jwt')
@ApiBearerAuth('jwt')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  @ApiOperation({ summary: 'Get list of all partner schools for dropdown pickers' })
  @ApiResponse({
    status: 200,
    description: 'Alphabetically sorted list of schools',
    type: [SchoolResponseDto],
  })
  async findAll(): Promise<SchoolResponseDto[]> {
    return this.schoolsService.findAll();
  }
}
