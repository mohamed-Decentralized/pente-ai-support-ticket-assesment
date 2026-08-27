import { TicketStatus } from '@pente/shared';
import { isSlaBreached } from './sla';

export const toInternalTicket = (ticket: any) => {
  const item = ticket.toObject ? ticket.toObject() : ticket;
  const latestSummaryIndex = item.conversations.reduce(
    (latest: number, message: { aiGenerated?: boolean }, index: number) =>
      message.aiGenerated ? index : latest,
    -1,
  );
  const conversations = item.conversations.filter(
    (message: { aiGenerated?: boolean }, index: number) =>
      !message.aiGenerated || index === latestSummaryIndex,
  );
  return {
    id: String(item._id),
    ticketNumber: item.ticketNumber,
    customerName: item.customerName,
    customerEmail: item.customerEmail,
    subject: item.subject,
    description: item.description,
    priority: item.priority,
    status: item.status,
    slaDueAt: item.slaDueAt,
    slaBreached: isSlaBreached(new Date(item.slaDueAt), item.status as TicketStatus),
    assignedTo: item.assignedTo,
    resolvedAt: item.resolvedAt,
    conversations,
    auditLog: item.auditLog,
    aiTriage: item.aiTriage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const toPublicTicket = (ticket: any) => {
  const internal = toInternalTicket(ticket);
  return {
    ticketNumber: internal.ticketNumber,
    customerName: internal.customerName,
    subject: internal.subject,
    description: internal.description,
    status: internal.status,
    conversations: internal.conversations.filter((msg: any) => !msg.aiGenerated),
    createdAt: internal.createdAt,
    updatedAt: internal.updatedAt,
  };
};
