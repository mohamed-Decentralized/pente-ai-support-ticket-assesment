import {
  customerReplySchema,
  customerTicketAccessSchema,
  publicLookupSchema,
  publicTicketCreateSchema,
} from '@pente/shared';
import { Router } from 'express';
import { AiProvider } from '../ai/ai-provider';
import { publicLookupRateLimit } from '../middleware/rate-limits';
import { validate } from '../middleware/validate';
import { TicketService } from '../services/ticket.service';
import { PublicController } from '../controllers/public.controller';

export const createPublicRouter = (aiProvider: AiProvider) => {
  const router = Router();
  const service = new TicketService(aiProvider);
  const controller = new PublicController(service);

  router.post('/tickets', validate(publicTicketCreateSchema), controller.createPublic);

  router.post(
    '/tickets/lookup',
    publicLookupRateLimit,
    validate(publicLookupSchema),
    controller.lookupPublic,
  );

  router.post(
    '/tickets/:ticketNumber/details',
    publicLookupRateLimit,
    validate(customerTicketAccessSchema),
    controller.getPublic,
  );

  router.post(
    '/tickets/:ticketNumber/replies',
    publicLookupRateLimit,
    validate(customerReplySchema),
    controller.customerReply,
  );

  return router;
};
