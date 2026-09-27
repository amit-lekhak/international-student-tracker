import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNotesDto {
  @ApiPropertyOptional({
    description: 'Updated application notes',
    example: 'Visa appointment booked for October 15th.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
