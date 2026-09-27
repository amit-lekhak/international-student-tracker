import { Controller, Post, Get, Body, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user & issue HTTP-only JWT cookie + Bearer token',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input payload' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out active user & clear session cookie' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    return this.authService.logout(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('jwt')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get profile details of the currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile information',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: AuthenticatedUser): UserResponseDto {
    return this.authService.getProfile(user);
  }
}
