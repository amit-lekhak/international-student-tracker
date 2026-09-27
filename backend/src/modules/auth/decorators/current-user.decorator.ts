import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../../types/enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  agentId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
