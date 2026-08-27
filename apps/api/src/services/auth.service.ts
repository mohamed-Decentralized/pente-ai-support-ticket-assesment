import { AuthUser } from '@pente/shared';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AppEnv } from '../config/env';
import { AppError, unauthorized } from '../lib/errors';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../lib/tokens';
import { RefreshTokenModel } from '../models/refresh-token.model';
import { UserModel } from '../models/user.model';

export class AuthService {
  constructor(private env: AppEnv) {}

  async login(email: string, password: string) {
    const user = await UserModel.findOne({ email, active: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }
    return this.issueSession(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      randomUUID(),
    );
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw unauthorized('Refresh token is required');
    let claims: { familyId: string; type: 'refresh' };
    try {
      claims = verifyRefreshToken(rawToken, this.env);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[AuthService] Refresh token validation failed: ${message}`);
      throw unauthorized('Invalid or expired refresh token');
    }
    if (claims.type !== 'refresh') throw unauthorized('Invalid refresh token');
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenModel.findOne({ tokenHash });
    if (!stored) throw unauthorized('Refresh token is not recognized');
    if (stored.revokedAt) {
      await RefreshTokenModel.updateMany(
        { familyId: stored.familyId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
      throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Refresh token reuse was detected');
    }
    if (stored.expiresAt.getTime() <= Date.now()) throw unauthorized('Refresh token has expired');
    const user = await UserModel.findOne({ _id: stored.userId, active: true });
    if (!user) throw unauthorized('User is no longer active');
    const next = createRefreshToken(this.env, stored.familyId);
    stored.revokedAt = new Date();
    stored.replacedByHash = next.hash;
    await stored.save();
    await this.storeRefreshToken(user.id, next.hash, next.familyId);
    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    return {
      user: authUser,
      accessToken: createAccessToken(authUser, this.env),
      refreshToken: next.raw,
    };
  }

  async logout(rawToken: string | undefined) {
    if (rawToken) {
      await RefreshTokenModel.updateOne(
        { tokenHash: hashToken(rawToken), revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
    }
  }

  private async issueSession(user: AuthUser, familyId: string) {
    const refresh = createRefreshToken(this.env, familyId);
    await this.storeRefreshToken(user.id, refresh.hash, refresh.familyId);
    return {
      user,
      accessToken: createAccessToken(user, this.env),
      refreshToken: refresh.raw,
    };
  }

  private async storeRefreshToken(userId: string, tokenHash: string, familyId: string) {
    await RefreshTokenModel.create({
      userId,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + this.env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });
  }
}
