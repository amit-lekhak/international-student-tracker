import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../types/enums';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique ID (UUID)',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'admin@tracker.com' })
  email: string;

  @ApiProperty({ description: 'User authorization role', enum: Role, example: Role.ADMIN })
  role: Role;

  @ApiPropertyOptional({
    description: 'Associated Agent ID (UUID) if role is AGENT',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  agentId?: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Authenticated user profile', type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    description: 'JWT Access Token for Bearer header auth',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
