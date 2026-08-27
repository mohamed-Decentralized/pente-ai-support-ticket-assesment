import { z } from 'zod';
import { TicketPriority, TicketStatus } from './constants';

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const publicTicketCreateSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerEmail: emailSchema,
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
});

export const publicLookupSchema = z.object({
  email: emailSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const customerTicketAccessSchema = z.object({
  email: emailSchema,
});

export const customerReplySchema = z.object({
  email: emailSchema,
  message: z.string().trim().min(1).max(5000),
});

export const staffReplySchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const ticketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const ticketPrioritySchema = z.object({
  priority: z.nativeEnum(TicketPriority),
});

export const ticketAssignmentSchema = z.object({
  assignedTo: emailSchema,
});

export const triageReviewSchema = z.object({
  accepted: z.boolean(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

export const ticketListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedTo: emailSchema.optional(),
  slaBreached: z.enum(['true', 'false']).optional(),
});
