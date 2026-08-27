import { loginSchema } from '@pente/shared';
import { Router } from 'express';
import { AppEnv } from '../config/env';
import { loginRateLimit } from '../middleware/rate-limits';
import { validate } from '../middleware/validate';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';

export const createAuthRouter = (env: AppEnv) => {
  const router = Router();
  const service = new AuthService(env);
  const controller = new AuthController(service, env);

  router.post('/login', loginRateLimit, validate(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  return router;
};
