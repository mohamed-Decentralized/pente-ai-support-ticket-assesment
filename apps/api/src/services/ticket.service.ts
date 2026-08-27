import {
  AiReviewStatus,
  AuthorType,
  AuthUser,
  statusTransitions,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '@pente/shared';
import { FilterQuery } from 'mongoose';
import { AiProvider, AiProviderError } from '../ai/ai-provider';
import { AppError, forbidden, notFound } from '../lib/errors';
import { calculateSlaDueAt } from '../lib/sla';
import { cleanText } from '../lib/sanitize';
import { toInternalTicket, toPublicTicket } from '../lib/ticket-view';
import { CounterModel } from '../models/counter.model';
import { TicketModel } from '../models/ticket.model';
import { UserModel } from '../models/user.model';

interface PublicTicketInput {
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
}

interface ListInput {
  page: number;
  limit: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  slaBreached?: 'true' | 'false';
}

export class TicketService {
  constructor(private aiProvider: AiProvider) {}

  async createPublic(input: PublicTicketInput) {
    const now = new Date();
    const priority = TicketPriority.Medium;
    const counter = await CounterModel.findByIdAndUpdate(
      'ticket',
      [{ $set: { sequence: { $add: [{ $ifNull: ['$sequence', 1000] }, 1] } } }],
      { upsert: true, new: true },
    );
    const ticketNumber = `TKT-${counter.sequence}`;
    const customerName = cleanText(input.customerName);
    const subject = cleanText(input.subject);
    const description = cleanText(input.description);
    const ticket = await TicketModel.create({
      ticketNumber,
      customerName,
      customerEmail: input.customerEmail,
      subject,
      description,
      priority,
      status: TicketStatus.Open,
      slaDueAt: calculateSlaDueAt(priority, now),
      createdAt: now,
      updatedAt: now,
      conversations: [
        {
          authorType: AuthorType.Customer,
          authorEmail: input.customerEmail,
          message: description,
          timestamp: now,
          aiGenerated: false,
        },
      ],
      auditLog: [
        {
          action: 'TICKET_CREATED',
          performedBy: input.customerEmail,
          role: AuthorType.Customer,
          timestamp: now,
        },
      ],
    });
    setImmediate(() => {
      void this.generateTriage(ticketNumber, true).catch(() => undefined);
    });
    return toPublicTicket(ticket);
  }

  async lookupPublic(email: string, page: number, limit: number) {
    const query = { customerEmail: email };
    const [items, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      TicketModel.countDocuments(query),
    ]);
    return {
      items: items.map(toPublicTicket),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getPublic(ticketNumber: string, email: string) {
    const ticket = await TicketModel.findOne({ ticketNumber });
    if (!ticket) throw notFound('Ticket not found');
    if (ticket.customerEmail !== email) throw notFound('Ticket not found');
    return toPublicTicket(ticket);
  }

  async customerReply(ticketNumber: string, email: string, rawMessage: string) {
    const ticket = await TicketModel.findOne({ ticketNumber });
    if (!ticket || ticket.customerEmail !== email) throw notFound('Ticket not found');
    if (ticket.status === TicketStatus.Closed) {
      throw new AppError(409, 'TICKET_CLOSED', 'Closed tickets cannot receive replies');
    }
    const message = cleanText(rawMessage);
    ticket.conversations.push({
      authorType: AuthorType.Customer,
      authorEmail: email,
      message,
      timestamp: new Date(),
      aiGenerated: false,
    });
    ticket.auditLog.push({
      action: 'CUSTOMER_REPLIED',
      performedBy: email,
      role: AuthorType.Customer,
      timestamp: new Date(),
    });
    if (ticket.status === TicketStatus.WaitingForCustomer) ticket.status = TicketStatus.InProgress;
    await ticket.save();
    return toPublicTicket(ticket);
  }

  async list(input: ListInput, actor: AuthUser) {
    const filter: FilterQuery<any> = {};
    if (input.status) filter.status = input.status;
    if (input.priority) filter.priority = input.priority;
    if (input.assignedTo) filter.assignedTo = input.assignedTo;

    if (actor.role === UserRole.Agent) {
      filter.$or = [
        { assignedTo: actor.email },
        { assignedTo: { $in: [null, ''] } },
        { assignedTo: { $exists: false } },
      ];
    }
    if (input.search) {
      const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = [
        { ticketNumber: { $regex: safe, $options: 'i' } },
        { subject: { $regex: safe, $options: 'i' } },
        { customerEmail: { $regex: safe, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
    if (input.slaBreached === 'true') {
      filter.slaDueAt = { $lt: new Date() };
      filter.status = { $nin: [TicketStatus.Resolved, TicketStatus.Closed] };
    }
    if (input.slaBreached === 'false') {
      filter.$or = [
        { slaDueAt: { $gte: new Date() } },
        { status: { $in: [TicketStatus.Resolved, TicketStatus.Closed] } },
      ];
    }
    const [items, total] = await Promise.all([
      TicketModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit),
      TicketModel.countDocuments(filter),
    ]);
    return {
      items: items.map(toInternalTicket),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async get(ticketNumber: string, actor: AuthUser) {
    const ticket = await TicketModel.findOne({ ticketNumber });
    if (!ticket) throw notFound('Ticket not found');
    if (actor.role === UserRole.Agent && ticket.assignedTo && ticket.assignedTo !== actor.email) {
      throw forbidden('You cannot view tickets assigned to other agents');
    }
    return toInternalTicket(ticket);
  }

  async dashboard(actor: AuthUser) {
    const now = new Date();
    const filter: FilterQuery<any> = {};
    if (actor.role === UserRole.Agent) {
      filter.$or = [
        { assignedTo: actor.email },
        { assignedTo: { $in: [null, ''] } },
        { assignedTo: { $exists: false } },
      ];
    }
    const [total, open, inProgress, waiting, resolved, slaBreached] = await Promise.all([
      TicketModel.countDocuments(filter),
      TicketModel.countDocuments({ ...filter, status: TicketStatus.Open }),
      TicketModel.countDocuments({ ...filter, status: TicketStatus.InProgress }),
      TicketModel.countDocuments({ ...filter, status: TicketStatus.WaitingForCustomer }),
      TicketModel.countDocuments({ ...filter, status: TicketStatus.Resolved }),
      TicketModel.countDocuments({
        ...filter,
        slaDueAt: { $lt: now },
        status: { $nin: [TicketStatus.Resolved, TicketStatus.Closed] },
      }),
    ]);
    return { total, open, inProgress, waiting, resolved, slaBreached };
  }

  async changeStatus(ticketNumber: string, status: TicketStatus, actor: AuthUser) {
    const ticket = await this.find(ticketNumber);
    if (actor.role === UserRole.Agent) {
      if (ticket.assignedTo && ticket.assignedTo !== actor.email) {
        throw forbidden('You cannot modify a ticket assigned to another agent');
      }
      if (!ticket.assignedTo) {
        throw forbidden('You must assign this ticket to yourself before taking action');
      }
    }
    const current = ticket.status as TicketStatus;
    if (!statusTransitions[current].includes(status)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot change status from ${current} to ${status}`,
      );
    }
    ticket.status = status;
    ticket.resolvedAt = status === TicketStatus.Resolved ? new Date() : undefined;
    ticket.auditLog.push({
      action: 'STATUS_CHANGED',
      performedBy: actor.email,
      role: actor.role,
      field: 'status',
      previousValue: current,
      newValue: status,
      timestamp: new Date(),
    });
    await ticket.save();
    return toInternalTicket(ticket);
  }

  async assign(ticketNumber: string, assignedTo: string, actor: AuthUser) {
    const ticket = await this.find(ticketNumber);
    if (
      actor.role === UserRole.Agent &&
      (assignedTo !== actor.email || Boolean(ticket.assignedTo))
    ) {
      throw forbidden('Agents can only take unassigned tickets for themselves');
    }
    const target = await UserModel.findOne({ email: assignedTo, active: true });
    if (!target)
      throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active staff member');
    const previous = ticket.assignedTo;
    ticket.assignedTo = assignedTo;
    ticket.auditLog.push({
      action: previous ? 'TICKET_REASSIGNED' : 'TICKET_ASSIGNED',
      performedBy: actor.email,
      role: actor.role,
      field: 'assignedTo',
      previousValue: previous,
      newValue: assignedTo,
      timestamp: new Date(),
    });
    await ticket.save();
    return toInternalTicket(ticket);
  }

  async changePriority(ticketNumber: string, priority: TicketPriority, actor: AuthUser) {
    if (actor.role !== UserRole.Admin) throw forbidden('Only Admins can change priority directly');
    const ticket = await this.find(ticketNumber);
    const previous = ticket.priority;
    ticket.priority = priority;
    ticket.slaDueAt = calculateSlaDueAt(priority, ticket.createdAt);
    ticket.auditLog.push({
      action: 'PRIORITY_CHANGED',
      performedBy: actor.email,
      role: actor.role,
      field: 'priority',
      previousValue: previous,
      newValue: priority,
      timestamp: new Date(),
    });
    await ticket.save();
    return toInternalTicket(ticket);
  }

  async staffReply(ticketNumber: string, rawMessage: string, actor: AuthUser) {
    const ticket = await this.find(ticketNumber);
    if (actor.role === UserRole.Agent) {
      if (ticket.assignedTo && ticket.assignedTo !== actor.email) {
        throw forbidden('You cannot modify a ticket assigned to another agent');
      }
      if (!ticket.assignedTo) {
        throw forbidden('You must assign this ticket to yourself before taking action');
      }
    }
    if (ticket.status === TicketStatus.Closed) {
      throw new AppError(409, 'TICKET_CLOSED', 'Closed tickets cannot receive replies');
    }
    ticket.conversations.push({
      authorType: actor.role === UserRole.Admin ? AuthorType.Admin : AuthorType.Agent,
      authorEmail: actor.email,
      message: cleanText(rawMessage),
      timestamp: new Date(),
      aiGenerated: false,
    });
    ticket.auditLog.push({
      action: 'STAFF_REPLIED',
      performedBy: actor.email,
      role: actor.role,
      timestamp: new Date(),
    });
    await ticket.save();
    return toInternalTicket(ticket);
  }

  async summarize(ticketNumber: string, actor: AuthUser) {
    const ticket = await this.find(ticketNumber);
    try {
      const summary = await this.aiProvider.summarizeConversation(
        ticket.conversations
          .filter((item) => !item.aiGenerated)
          .map((item) => ({ author: item.authorType, message: item.message })),
      );
      const replaced = ticket.conversations.some((item) => item.aiGenerated);
      for (let index = ticket.conversations.length - 1; index >= 0; index -= 1) {
        if (ticket.conversations[index]?.aiGenerated) ticket.conversations.splice(index, 1);
      }
      ticket.conversations.push({
        authorType: actor.role === UserRole.Admin ? AuthorType.Admin : AuthorType.Agent,
        authorEmail: actor.email,
        message: summary,
        timestamp: new Date(),
        aiGenerated: true,
      });
      ticket.auditLog.push({
        action: 'AI_SUMMARY_GENERATED',
        performedBy: actor.email,
        role: actor.role,
        timestamp: new Date(),
      });
      await ticket.save();
      return { summary, replaced, ticket: toInternalTicket(ticket) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[TicketService] Summary generation failed for ${ticketNumber}: ${message}`);
      if (error instanceof AiProviderError) {
        throw new AppError(
          error.reason === 'rate_limited' ? 429 : 503,
          'AI_UNAVAILABLE',
          'AI summary is unavailable. You can continue managing the ticket and try again later.',
        );
      }
      throw error;
    }
  }

  async generateTriage(ticketNumber: string, silent = false) {
    const ticket = await this.find(ticketNumber);
    try {
      const result = await this.aiProvider.triageTicket(ticket.subject, ticket.description);
      const aiTriage = {
        ...result,
        status: AiReviewStatus.PendingReview,
        generatedAt: new Date(),
      };
      const updated = await TicketModel.findOneAndUpdate(
        { ticketNumber },
        {
          $set: { aiTriage },
          $push: {
            auditLog: {
              action: 'AI_TRIAGE_GENERATED',
              performedBy: 'ai-provider',
              role: 'System',
              timestamp: new Date(),
            },
          },
        },
        { new: true },
      );
      return toInternalTicket(updated ?? ticket);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[TicketService] Triage generation failed for ${ticketNumber}: ${message}`);
      const shouldClearFailedState =
        !ticket.aiTriage || ticket.aiTriage.status === AiReviewStatus.Failed;
      const updated = shouldClearFailedState
        ? await TicketModel.findOneAndUpdate(
            { ticketNumber },
            { $unset: { aiTriage: 1 } },
            { new: true },
          )
        : ticket;
      if (silent) return toInternalTicket(updated ?? ticket);
      if (error instanceof AiProviderError) {
        throw new AppError(
          error.reason === 'rate_limited' ? 429 : 503,
          'AI_UNAVAILABLE',
          'AI triage is unavailable. You can continue managing the ticket and try again later.',
        );
      }
      throw error;
    }
  }

  async reviewTriage(
    ticketNumber: string,
    accepted: boolean,
    selectedPriority: TicketPriority | undefined,
    actor: AuthUser,
  ) {
    const ticket = await this.find(ticketNumber);
    if (actor.role === UserRole.Agent) {
      if (ticket.assignedTo && ticket.assignedTo !== actor.email) {
        throw forbidden('You cannot modify a ticket assigned to another agent');
      }
      if (!ticket.assignedTo) {
        throw forbidden('You must assign this ticket to yourself before taking action');
      }
    }
    if (!ticket.aiTriage || ticket.aiTriage.status !== AiReviewStatus.PendingReview) {
      throw new AppError(409, 'NO_PENDING_TRIAGE', 'This ticket has no pending AI recommendation');
    }
    const previous = ticket.priority;
    if (accepted) ticket.priority = ticket.aiTriage.suggestedPriority;
    if (!accepted && selectedPriority) ticket.priority = selectedPriority;
    if (ticket.priority !== previous)
      ticket.slaDueAt = calculateSlaDueAt(ticket.priority, ticket.createdAt);
    ticket.aiTriage.status = accepted ? AiReviewStatus.Accepted : AiReviewStatus.Rejected;
    ticket.aiTriage.reviewedAt = new Date();
    ticket.aiTriage.reviewedBy = actor.email;
    ticket.auditLog.push({
      action: accepted ? 'AI_TRIAGE_ACCEPTED' : 'AI_TRIAGE_REJECTED',
      performedBy: actor.email,
      role: actor.role,
      field: 'priority',
      previousValue: previous,
      newValue: ticket.priority,
      timestamp: new Date(),
    });
    await ticket.save();
    return toInternalTicket(ticket);
  }

  async delete(ticketNumber: string, actor: AuthUser) {
    if (actor.role !== UserRole.Admin) throw forbidden('Only Admins can delete tickets');
    const ticket = await this.find(ticketNumber);
    await TicketModel.deleteOne({ _id: ticket._id });
    return { deleted: true, ticketNumber };
  }

  async getAuditLog(ticketNumber: string, page: number, limit: number, actor: AuthUser) {
    const ticket = await this.find(ticketNumber);
    if (actor.role === UserRole.Agent && ticket.assignedTo && ticket.assignedTo !== actor.email) {
      throw forbidden('You cannot view audit logs for tickets assigned to other agents');
    }
    const skip = (page - 1) * limit;

    // Reverse the audit log so newest is first, then slice
    const sortedLog = [...ticket.auditLog].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const items = sortedLog.slice(skip, skip + limit);
    const total = sortedLog.length;

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async listStaff(page: number, limit: number) {
    const [items, total] = await Promise.all([
      UserModel.find({ active: true })
        .select('name email role')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments({ active: true }),
    ]);
    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  private async find(ticketNumber: string) {
    const ticket = await TicketModel.findOne({ ticketNumber });
    if (!ticket) throw notFound('Ticket not found');
    return ticket;
  }
}
