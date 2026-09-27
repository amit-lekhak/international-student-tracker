import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { FilterApplicationsDto } from './dto/filter-applications.dto';
import {
  ApplicationResponseDto,
  PaginatedApplicationsResponseDto,
} from './dto/application-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../types/enums';

@ApiTags('Applications')
@Controller('api/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiCookieAuth('jwt')
@ApiBearerAuth('jwt')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List and filter applications with tenant-isolated scoping (RBAC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of applications matching search and filter criteria',
    type: PaginatedApplicationsResponseDto,
  })
  async findAll(
    @Query() filterDto: FilterApplicationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedApplicationsResponseDto> {
    return this.applicationsService.findAll(filterDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single application details with relations (RBAC scoped)' })
  @ApiParam({ name: 'id', description: 'Application UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Application details with program and agent info',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden: application belongs to another agent' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new student application (Auto-assigns agent for AGENT role)' })
  @ApiResponse({
    status: 201,
    description: 'Application successfully created',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(
    @Body() createDto: CreateApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(createDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application details / stage (Auto-tracks stageEnteredDate)' })
  @ApiParam({ name: 'id', description: 'Application UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Application updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.update(id, updateDto, user);
  }

  @Patch(':id/notes')
  @ApiOperation({ summary: 'Update application notes (Live auto-save support)' })
  @ApiParam({ name: 'id', description: 'Application UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Notes updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateNotes(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateNotesDto: UpdateNotesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.updateNotes(id, updateNotesDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete application record (Admin only)' })
  @ApiParam({ name: 'id', description: 'Application UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Application deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.applicationsService.remove(id, user);
  }
}
