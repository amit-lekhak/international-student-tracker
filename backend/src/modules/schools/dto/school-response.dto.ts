import { ApiProperty } from '@nestjs/swagger';

export class SchoolResponseDto {
  @ApiProperty({ description: 'School UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'School Name', example: 'University of Toronto' })
  name: string;

  @ApiProperty({ description: 'School Country', example: 'Canada' })
  country: string;
}
