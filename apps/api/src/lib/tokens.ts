import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuthUser } from '@pente/shared';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppEnv } from '../config/env';

export interface AccessClaims {
  sub: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  type: 'access';
}

export const createAccessToken = (user: AuthUser, env: AppEnv) =>
  jwt.sign(
    { email: user.email, name: user.name, role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] },
  );

export const verifyAccessToken = (token: string, env: AppEnv) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;

export const createRefreshToken = (env: AppEnv, familyId: string = randomUUID()) => {
  const raw = randomBytes(48).toString('base64url');
  const signature = jwt.sign({ nonce: raw, familyId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRY_DAYS}d`,
  });
  return { raw: signature, hash: hashToken(signature), familyId };
};

export const verifyRefreshToken = (token: string, env: AppEnv) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { familyId: string; type: 'refresh' };

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
