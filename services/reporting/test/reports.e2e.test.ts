import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../src/auth.guard';
import { HttpExceptionFilter } from '../src/http-exception.filter';
import { ReportsController } from '../src/reports.controller';
import { ReportsService } from '../src/reports.service';

describe('reporting endpoints', () => {
  let app: INestApplication;
  const reports = {
    overview: vi.fn().mockResolvedValue({
      data: { total: 3, byStatus: [], byPriority: [] },
      cache: 'miss',
      ttlMs: 60000,
    }),
    agents: vi.fn().mockResolvedValue([]),
    slaBreaches: vi.fn().mockResolvedValue([]),
    trends: vi.fn().mockImplementation((days: number) =>
      Promise.resolve(
        Array.from({ length: days }, (_, index) => ({
          date: `day-${index}`,
          created: 0,
          resolved: 0,
        })),
      ),
    ),
    webhookPreview: vi.fn().mockImplementation((payload) => ({
      externalReference: payload.externalId,
      customerEmail: payload.customer.email.toLowerCase(),
      persisted: false,
    })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: reports }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the required overview endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/reports/overview');
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(3);
  });

  it('validates the trends day range', async () => {
    const response = await request(app.getHttpServer()).get('/reports/trends?days=100');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.text).not.toContain('stack');
  });

  it('validates and previews a webhook without persistence', async () => {
    const response = await request(app.getHttpServer())
      .post('/reports/webhook-preview')
      .send({
        externalId: 'external-1',
        customer: { name: 'Alice Customer', email: 'ALICE@example.com' },
        subject: 'Account access failed',
        description: 'The customer cannot access their paid account.',
        urgency: 'high',
      });
    expect(response.status).toBe(201);
    expect(response.body.persisted).toBe(false);
  });
});
