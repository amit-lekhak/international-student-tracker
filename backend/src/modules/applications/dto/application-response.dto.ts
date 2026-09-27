import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStage } from '../../../types/enums';
import { AgentResponseDto } from '../../agents/dto/agent-response.dto';
import { ProgramResponseDto } from '../../programs/dto/program-response.dto';
import { PaginatedResponseMetaDto } from '../../../common/dto/paginated-response.dto';

export class ApplicationResponseDto {
  @ApiProperty({
    description: 'Application unique ID (UUID)',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  id: string;

  @ApiProperty({ description: 'Student Name', example: 'Aarav Sharma' })
  studentName: string;

  @ApiProperty({ description: 'Agent ID (UUID)', example: 'a1111111-1111-1111-1111-111111111111' })
  agentId: string;

  @ApiProperty({
    description: 'Program ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  programId: string;

  @ApiProperty({
    description: 'Application Stage',
    enum: ApplicationStage,
    example: ApplicationStage.APPLIED,
  })
  stage: ApplicationStage;

  @ApiProperty({
    description: 'Date current stage was entered',
    example: '2026-03-15T08:30:00.000Z',
  })
  stageEnteredDate: Date;

  @ApiProperty({ description: 'Application creation date', example: '2026-01-10T10:00:00.000Z' })
  createdDate: Date;

  @ApiPropertyOptional({
    description: 'Counselor or internal notes',
    example: 'Documents submitted for review.',
  })
  notes: string | null;

  @ApiProperty({ description: 'Record creation timestamp', example: '2026-01-10T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Record last updated timestamp',
    example: '2026-03-15T08:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Associated Partner Agent details',
    type: () => AgentResponseDto,
  })
  agent?: AgentResponseDto;

  @ApiPropertyOptional({
    description: 'Associated Program details',
    type: () => ProgramResponseDto,
  })
  program?: ProgramResponseDto;
}

export class PaginatedApplicationsResponseDto {
  @ApiProperty({
    description: 'List of applications for current page',
    type: [ApplicationResponseDto],
  })
  items: ApplicationResponseDto[];

  @ApiProperty({ description: 'Pagination metadata', type: () => PaginatedResponseMetaDto })
  meta: PaginatedResponseMetaDto;
}
