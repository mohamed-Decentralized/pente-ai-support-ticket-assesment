import { Request, Response } from 'express';
import { AppEnv } from '../config/env';
import { AuthService } from '../services/auth.service';

const cookieName = 'pente_refresh';

const cookieOptions = (env: AppEnv) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
});

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly env: AppEnv,
  ) {}

  login = async (req: Request, res: Response) => {
    const session = await this.service.login(req.body.email, req.body.password);
    res.cookie(cookieName, session.refreshToken, cookieOptions(this.env));
    res.json({
      user: session.user,
      accessToken: session.accessToken,
      expiresIn: this.env.JWT_ACCESS_EXPIRY,
    });
  };

  refresh = async (req: Request, res: Response) => {
    const session = await this.service.refresh(req.cookies[cookieName]);
    res.cookie(cookieName, session.refreshToken, cookieOptions(this.env));
    res.json({
      user: session.user,
      accessToken: session.accessToken,
      expiresIn: this.env.JWT_ACCESS_EXPIRY,
    });
  };

  logout = async (req: Request, res: Response) => {
    await this.service.logout(req.cookies[cookieName]);
    res.clearCookie(cookieName, cookieOptions(this.env));
    res.status(204).send();
  };
}
