import { z } from 'zod';
import { TicketPriority, TicketStatus } from './constants';

export const emailSchema = z
  .string({ required_error: 'Enter a valid email address.' })
  .trim()
  .email({ message: 'Enter a valid email address.' })
  .max(254)
  .transform((value) => value.toLowerCase());

export const publicTicketCreateSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must contain at least 2 characters.' })
    .max(100),
  customerEmail: emailSchema,
  subject: z
    .string()
    .trim()
    .min(3, { message: 'Subject must contain at least 3 characters.' })
    .max(160),
  description: z
    .string()
    .trim()
    .min(10, { message: 'Description must contain at least 10 characters.' })
    .max(5000),
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
  message: z.string().trim().min(1, { message: 'Reply cannot be empty.' }).max(5000),
});

export const staffReplySchema = z.object({
  message: z.string().trim().min(1, { message: 'Reply cannot be empty.' }).max(5000),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, { message: 'Password must contain at least 8 characters.' }).max(128),
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
