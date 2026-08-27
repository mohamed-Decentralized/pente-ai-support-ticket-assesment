import { slaHours, terminalStatuses, TicketPriority, TicketStatus } from '@pente/shared';

export const calculateSlaDueAt = (priority: TicketPriority, from = new Date()) =>
  new Date(from.getTime() + slaHours[priority] * 60 * 60 * 1000);

export const isSlaBreached = (slaDueAt: Date, status: TicketStatus, now = new Date()) =>
  !terminalStatuses.includes(status) && slaDueAt.getTime() < now.getTime();
