import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FilterProgramsDto {
  @ApiPropertyOptional({
    description: 'Filter programs by School ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'schoolId must be a valid UUID' })
  schoolId?: string;
}
