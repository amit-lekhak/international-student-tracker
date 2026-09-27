import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { Role } from '../../types/enums';
import { AuthenticatedUser } from './decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  agentId: string | null;
}

const cookieOrHeaderExtractor = (req: Request): string | null => {
  if (req && req.cookies && req.cookies.jwt) {
    return req.cookies.jwt;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: cookieOrHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'tracker-default-dev-secret-key-2026',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid JWT payload claims');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      agentId: payload.agentId || null,
    };
  }
}
