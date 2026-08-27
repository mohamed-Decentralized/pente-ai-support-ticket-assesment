import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TicketStatus } from '@pente/shared';
import { Model } from 'mongoose';
import { ReportCacheService } from './cache.service';
import { config } from './config';
import { WebhookPreviewDto } from './report.dto';
import { Ticket, TicketDocument } from './ticket.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    private cache: ReportCacheService,
  ) {}

  async overview() {
    const cached = await this.cache.get<unknown>('reports:overview');
    if (cached) {
      return {
        data: cached,
        cache: 'hit',
        cacheBackend: this.cache.backend(),
        ttlMs: config.REPORT_CACHE_TTL_MS,
      };
    }
    const [result] = await this.ticketModel.aggregate([
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
          total: [{ $count: 'count' }],
        },
      },
    ]);
    const data = {
      total: result?.total?.[0]?.count ?? 0,
      byStatus: result?.byStatus ?? [],
      byPriority: result?.byPriority ?? [],
    };
    await this.cache.set('reports:overview', data, config.REPORT_CACHE_TTL_MS);
    return {
      data,
      cache: 'miss',
      cacheBackend: this.cache.backend(),
      ttlMs: config.REPORT_CACHE_TTL_MS,
    };
  }

  async agents(page: number, limit: number) {
    let data = await this.cache.get<unknown[]>('reports:agents');
    if (!data) {
      data = await this.ticketModel.aggregate([
        { $match: { assignedTo: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$assignedTo',
            ticketCount: { $sum: 1 },
            resolvedCount: {
              $sum: {
                $cond: [{ $in: ['$status', [TicketStatus.Resolved, TicketStatus.Closed]] }, 1, 0],
              },
            },
            averageResolutionMs: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            assignedTo: '$_id',
            ticketCount: 1,
            resolvedCount: 1,
            averageResolutionMs: 1,
          },
        },
        { $sort: { ticketCount: -1 } },
      ]);
      await this.cache.set('reports:agents', data, config.REPORT_AGENTS_CACHE_TTL_MS);
    }

    const skip = (page - 1) * limit;
    const total = data.length;
    const items = data.slice(skip, skip + limit);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async slaBreaches(page: number, limit: number) {
    const now = new Date();
    const approachingAt = new Date(now.getTime() + config.SLA_APPROACHING_MINUTES * 60 * 1000);
    const filter = {
      status: { $nin: [TicketStatus.Resolved, TicketStatus.Closed] },
      slaDueAt: { $lte: approachingAt },
    };

    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .select('ticketNumber subject priority status assignedTo slaDueAt')
        .sort({ slaDueAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.ticketModel.countDocuments(filter),
    ]);

    const items = tickets.map((ticket) => ({
      ...ticket,
      state: new Date(ticket.slaDueAt).getTime() < now.getTime() ? 'breached' : 'approaching',
      minutesFromDeadline: Math.round(
        (new Date(ticket.slaDueAt).getTime() - now.getTime()) / 60000,
      ),
    }));

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async trends(days: number) {
    const cacheKey = `reports:trends:${days}`;
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const [created, resolved] = await Promise.all([
      this.ticketModel.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      this.ticketModel.aggregate([
        { $match: { resolvedAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    const createdMap = new Map(created.map((item) => [item._id, item.count]));
    const resolvedMap = new Map(resolved.map((item) => [item._id, item.count]));
    const data = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, created: createdMap.get(key) ?? 0, resolved: resolvedMap.get(key) ?? 0 };
    });
    await this.cache.set(cacheKey, data, config.REPORT_TRENDS_CACHE_TTL_MS);
    return data;
  }

  webhookPreview(payload: WebhookPreviewDto) {
    const priorityMap: Record<string, string> = {
      low: 'Low',
      normal: 'Medium',
      high: 'High',
      urgent: 'Critical',
    };
    return {
      source: 'external-webhook',
      externalReference: payload.externalId,
      customerName: payload.customer.name.trim(),
      customerEmail: payload.customer.email.trim().toLowerCase(),
      subject: payload.subject.trim(),
      description: payload.description.trim(),
      suggestedPriority: priorityMap[payload.urgency ?? 'normal'],
      persisted: false,
      normalizedAt: new Date().toISOString(),
    };
  }
}
