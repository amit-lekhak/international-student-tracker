import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AiQueryDto {
  @ApiProperty({
    description:
      'Natural language question regarding student applications, bottlenecks, or performance.',
    example: 'Why are Gold-tier agents converting faster than Bronze?',
  })
  @IsString()
  @IsNotEmpty({ message: 'question must not be empty' })
  @MaxLength(500, { message: 'question must not exceed 500 characters' })
  question: string;
}
