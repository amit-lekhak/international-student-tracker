import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolResponseDto } from '../../schools/dto/school-response.dto';

export class ProgramResponseDto {
  @ApiProperty({ description: 'Program UUID', example: '660e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ description: 'School UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  schoolId: string;

  @ApiProperty({ description: 'Program Name', example: 'MSc Computer Science' })
  name: string;

  @ApiProperty({ description: 'Annual Tuition in USD', example: 28000 })
  tuitionUsd: number;

  @ApiPropertyOptional({ description: 'Parent School details', type: () => SchoolResponseDto })
  school?: SchoolResponseDto;
}
