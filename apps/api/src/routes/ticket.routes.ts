import {
  staffReplySchema,
  ticketAssignmentSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
  triageReviewSchema,
  UserRole,
} from '@pente/shared';
import { Router } from 'express';
import { AiProvider } from '../ai/ai-provider';
import { AppEnv } from '../config/env';
import { authenticate, requireRole } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rate-limits';
import { validate } from '../middleware/validate';
import { TicketService } from '../services/ticket.service';
import { TicketController } from '../controllers/ticket.controller';

export const createTicketRouter = (env: AppEnv, aiProvider: AiProvider) => {
  const router = Router();
  const service = new TicketService(aiProvider);
  const controller = new TicketController(service);

  router.use(authenticate(env), requireRole(UserRole.Agent, UserRole.Admin));

  router.get('/dashboard', controller.dashboard);
  router.get('/', controller.list);
  router.get('/staff', controller.listStaff);
  router.get('/:ticketNumber', controller.get);
  router.get('/:ticketNumber/audit-log', controller.getAuditLog);

  router.patch('/:ticketNumber/status', validate(ticketStatusSchema), controller.changeStatus);
  router.patch('/:ticketNumber/assignment', validate(ticketAssignmentSchema), controller.assign);
  router.patch(
    '/:ticketNumber/priority',
    requireRole(UserRole.Admin),
    validate(ticketPrioritySchema),
    controller.changePriority,
  );

  router.post('/:ticketNumber/replies', validate(staffReplySchema), controller.staffReply);

  router.post('/:ticketNumber/ai/summary', aiRateLimit, controller.summarize);
  router.post('/:ticketNumber/ai/triage', aiRateLimit, controller.generateTriage);
  router.post(
    '/:ticketNumber/ai/triage/review',
    validate(triageReviewSchema),
    controller.reviewTriage,
  );

  router.delete('/:ticketNumber', requireRole(UserRole.Admin), controller.delete);

  return router;
};
