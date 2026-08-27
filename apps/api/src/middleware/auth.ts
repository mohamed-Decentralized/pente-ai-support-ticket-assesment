import { UserRole } from '@pente/shared';
import { NextFunction, Request, Response } from 'express';
import { AppEnv } from '../config/env';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

export const authenticate =
  (env: AppEnv) => (request: Request, _response: Response, next: NextFunction) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(unauthorized());
      return;
    }
    try {
      const claims = verifyAccessToken(header.slice(7), env);
      if (claims.type !== 'access') throw unauthorized('Invalid access token');
      request.user = {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        role: claims.role,
      };
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[AuthMiddleware] Access token validation failed: ${message}`);
      next(unauthorized('Invalid or expired access token'));
    }
  };

export const requireRole =
  (...roles: UserRole[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
