import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApplicationStage } from '../../../types/enums';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Student Full Name',
    example: 'Arun Sharma',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  studentName: string;

  @ApiProperty({
    description: 'Program ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'programId must be a valid UUID' })
  @IsNotEmpty()
  programId: string;

  @ApiPropertyOptional({
    description: 'Agent ID (UUID) - automatically populated for AGENT role users',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID('4', { message: 'agentId must be a valid UUID' })
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Initial application pipeline stage',
    enum: ApplicationStage,
    default: ApplicationStage.LEAD,
    example: ApplicationStage.LEAD,
  })
  @IsOptional()
  @IsEnum(ApplicationStage, {
    message: `stage must be a valid ApplicationStage: ${Object.values(ApplicationStage).join(', ')}`,
  })
  stage?: ApplicationStage = ApplicationStage.LEAD;

  @ApiPropertyOptional({
    description: 'Optional counselor or admissions notes',
    example: 'Student has IELTS 7.5 and completed undergraduate degree in IT.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
