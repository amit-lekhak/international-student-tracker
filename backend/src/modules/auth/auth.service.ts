import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserResponseDto } from './dto/user-response.dto';
import { AuthenticatedUser } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(email: string, pass: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(loginDto: LoginDto, res?: Response): Promise<LoginResponseDto> {
    const user = await this.validateCredentials(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    };

    const accessToken = this.jwtService.sign(payload);

    if (res) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    const userProfile: UserResponseDto = {
      id: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    };

    return {
      user: userProfile,
      accessToken,
    };
  }

  logout(res: Response): { message: string } {
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  getProfile(user: AuthenticatedUser): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    };
  }
}
