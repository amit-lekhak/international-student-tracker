import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApplicationStage, AgentTier } from '../../../types/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterApplicationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter applications by stage',
    enum: ApplicationStage,
  })
  @IsOptional()
  @IsEnum(ApplicationStage, {
    message: `stage must be a valid ApplicationStage: ${Object.values(ApplicationStage).join(', ')}`,
  })
  stage?: ApplicationStage;

  @ApiPropertyOptional({
    description: 'Filter applications by School ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'schoolId must be a valid UUID' })
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Filter applications by Program ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'programId must be a valid UUID' })
  programId?: string;

  @ApiPropertyOptional({
    description: 'Filter applications by Agent ID (UUID) - Admin only',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID('4', { message: 'agentId must be a valid UUID' })
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Filter applications by Agent Tier',
    enum: AgentTier,
  })
  @IsOptional()
  @IsEnum(AgentTier, {
    message: `tier must be a valid AgentTier: ${Object.values(AgentTier).join(', ')}`,
  })
  tier?: AgentTier;

  @ApiPropertyOptional({
    description: 'Search string matching student name (case-insensitive)',
    example: 'Aarav',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter applications created on or after this ISO date',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter applications created on or before this ISO date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: ['createdDate', 'stageEnteredDate', 'studentName', 'createdAt'],
    default: 'createdDate',
  })
  @IsOptional()
  @IsIn(['createdDate', 'stageEnteredDate', 'studentName', 'createdAt'])
  sortBy?: string = 'createdDate';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
