import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@pente/shared';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: { role: UserRole } }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException('Authentication is required');
    try {
      const claims = jwt.verify(header.slice(7), config.JWT_ACCESS_SECRET) as {
        type: string;
        role: UserRole;
      };
      if (claims.type !== 'access') throw new UnauthorizedException('Invalid access token');
      request.user = { role: claims.role };
      const roles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (roles && !roles.includes(claims.role))
        throw new ForbiddenException('Insufficient permission');
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException)
        throw error;
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Access token validation failed: ${message}`, 'JwtAuthGuard');
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
