import { ApiProperty } from '@nestjs/swagger';
import { AgentTier } from '../../../types/enums';

export class AgentResponseDto {
  @ApiProperty({ description: 'Agent UUID', example: 'a1111111-1111-1111-1111-111111111111' })
  id: string;

  @ApiProperty({ description: 'Agency Name', example: 'Global Education Pathways' })
  name: string;

  @ApiProperty({ description: 'Agent Country', example: 'India' })
  country: string;

  @ApiProperty({ description: 'Agent Performance Tier', enum: AgentTier, example: AgentTier.GOLD })
  tier: AgentTier;
}
