import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApplicationStage } from '../../../types/enums';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    description: 'Updated Student Full Name',
    example: 'Arun Kumar Sharma',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  studentName?: string;

  @ApiPropertyOptional({
    description: 'Updated pipeline stage',
    enum: ApplicationStage,
    example: ApplicationStage.OFFER_RECEIVED,
  })
  @IsOptional()
  @IsEnum(ApplicationStage, {
    message: `stage must be a valid ApplicationStage: ${Object.values(ApplicationStage).join(', ')}`,
  })
  stage?: ApplicationStage;
}
