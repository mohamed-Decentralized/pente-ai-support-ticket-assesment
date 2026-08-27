import { AiReviewStatus, TicketPriority, TicketStatus, UserRole } from '@pente/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AiProvider, AiProviderError, TriageResult } from '../src/ai/ai-provider';
import { createApp } from '../src/app';
import { AppEnv } from '../src/config/env';
import { CounterModel } from '../src/models/counter.model';
import { RefreshTokenModel } from '../src/models/refresh-token.model';
import { TicketModel } from '../src/models/ticket.model';
import { UserModel } from '../src/models/user.model';

class MockAiProvider implements AiProvider {
  failSummary = false;
  failTriage = false;

  async summarizeConversation() {
    if (this.failSummary) throw new AiProviderError('timeout', 'timeout');
    return 'Issue: Payment failed. Actions Taken: Reviewed. Current Situation: Open. Next Step: Verify.';
  }

  async triageTicket(): Promise<TriageResult> {
    if (this.failTriage) throw new AiProviderError('timeout', 'timeout');
    return {
      suggestedPriority: TicketPriority.High,
      suggestedCategory: 'Billing',
      reason: 'A failed financial transaction needs prompt review.',
      confidence: 0.92,
    };
  }
}

let mongo: MongoMemoryServer;
let env: AppEnv;
let ai: MockAiProvider;
let app: ReturnType<typeof createApp>;

const users = {
  agent: {
    email: 'agent@pente.ai',
    password: 'AgentPass123!',
    role: UserRole.Agent,
    name: 'Agent User',
  },
  admin: {
    email: 'admin@pente.ai',
    password: 'AdminPass123!',
    role: UserRole.Admin,
    name: 'Admin User',
  },
};

const seedUsers = async () => {
  for (const user of Object.values(users)) {
    await UserModel.create({
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: await bcrypt.hash(user.password, 4),
      active: true,
    });
  }
};

const login = async (kind: keyof typeof users) => {
  const user = users[kind];
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password });
  return {
    token: response.body.accessToken as string,
    cookie: response.headers['set-cookie']?.[0] as string,
  };
};

const createTicket = async (overrides: Record<string, string> = {}) => {
  const response = await request(app)
    .post('/api/v1/public/tickets')
    .send({
      customerName: 'Alice Customer',
      customerEmail: 'alice@example.com',
      subject: 'Payment was deducted',
      description: 'My payment failed but the amount was still deducted from my account.',
      ...overrides,
    });
  if (response.status === 201) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const ticket = await TicketModel.findOne({ ticketNumber: response.body.ticketNumber });
      if (ticket?.aiTriage) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  return response;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  env = {
    NODE_ENV: 'test',
    MONGODB_URI: mongo.getUri(),
    API_PORT: 4000,
    WEB_ORIGIN: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'test-access-secret-with-thirty-two-characters',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-thirty-two-characters',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY_DAYS: 7,
    GEMINI_MODEL: 'test',
    GEMINI_BASE_URL: 'https://example.com',
    AI_TIMEOUT_MS: 20,
    AI_PROVIDER: 'disabled',
    LOG_LEVEL: 'silent',
  };
  ai = new MockAiProvider();
  app = createApp({ env, aiProvider: ai });
});

beforeEach(async () => {
  ai.failSummary = false;
  ai.failTriage = false;
  await Promise.all([
    UserModel.deleteMany({}),
    TicketModel.deleteMany({}),
    CounterModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
  ]);
  await seedUsers();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('public ticket workflow', () => {
  it('creates a public ticket with a human-readable number and calculated SLA', async () => {
    const response = await createTicket();
    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toBe('TKT-1001');
    expect(response.body.priority).toBeUndefined();
    expect(response.body.slaDueAt).toBeUndefined();
  });

  it('rejects an invalid public email address', async () => {
    const response = await createTicket({ customerEmail: 'not-an-email' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sanitizes customer HTML before persistence', async () => {
    const response = await createTicket({
      description: '<script>alert(1)</script> A valid customer description.',
    });
    expect(response.status).toBe(201);
    expect(response.body.description).not.toContain('<script>');
  });

  it('looks up tickets by normalized customer email', async () => {
    await createTicket();
    const response = await request(app)
      .post('/api/v1/public/tickets/lookup')
      .send({ email: 'ALICE@example.com' });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
  });

  it('does not expose internal fields in public lookup results', async () => {
    await createTicket();
    const response = await request(app)
      .post('/api/v1/public/tickets/lookup')
      .send({ email: 'alice@example.com' });
    expect(response.body.items[0]).not.toHaveProperty('auditLog');
    expect(response.body.items[0]).not.toHaveProperty('assignedTo');
    expect(response.body.items[0]).not.toHaveProperty('customerEmail');
  });

  it('hides ticket existence when the supplied customer email does not match', async () => {
    const created = await createTicket();
    const response = await request(app)
      .post(`/api/v1/public/tickets/${created.body.ticketNumber}/details`)
      .send({ email: 'attacker@example.com' });
    expect(response.status).toBe(404);
  });

  it('adds a customer reply to the conversation', async () => {
    const created = await createTicket();
    const response = await request(app)
      .post(`/api/v1/public/tickets/${created.body.ticketNumber}/replies`)
      .send({ email: 'alice@example.com', message: 'The transaction reference is TX-42.' });
    expect(response.status).toBe(201);
    expect(response.body.conversations.at(-1).message).toContain('TX-42');
  });

  it('denies customer deletion because no public delete route exists', async () => {
    const created = await createTicket();
    const response = await request(app).delete(
      `/api/v1/public/tickets/${created.body.ticketNumber}`,
    );
    expect(response.status).toBe(404);
  });
});

describe('authentication and authorization', () => {
  it('issues an access token and HTTP-only refresh cookie', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: users.agent.email,
      password: users.agent.password,
    });
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('rotates a refresh token and rejects reuse', async () => {
    const first = await login('agent');
    const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', first.cookie);
    expect(refreshed.status).toBe(200);
    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', first.cookie);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  it('rejects an invalid access token', async () => {
    const response = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer invalid');
    expect(response.status).toBe(401);
  });

  it('rejects an expired access token', async () => {
    const token = jwt.sign(
      { email: users.agent.email, name: users.agent.name, role: users.agent.role, type: 'access' },
      env.JWT_ACCESS_SECRET,
      { subject: new mongoose.Types.ObjectId().toString(), expiresIn: -1 },
    );
    const response = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('allows an Admin to delete a ticket', async () => {
    const created = await createTicket();
    const { token } = await login('admin');
    const response = await request(app)
      .delete(`/api/v1/tickets/${created.body.ticketNumber}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(await TicketModel.countDocuments()).toBe(0);
  });

  it('forbids an Agent from deleting a ticket', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    const response = await request(app)
      .delete(`/api/v1/tickets/${created.body.ticketNumber}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('allows an Agent to take an unassigned ticket', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    const response = await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/assignment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedTo: users.agent.email });
    expect(response.status).toBe(200);
    expect(response.body.assignedTo).toBe(users.agent.email);
  });

  it('forbids an Agent from assigning a ticket to an Admin', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    const response = await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/assignment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedTo: users.admin.email });
    expect(response.status).toBe(403);
  });
});

describe('ticket rules and AI', () => {
  it('rejects an invalid status transition', async () => {
    const created = await createTicket();
    const { token } = await login('agent');

    await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/assignment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedTo: users.agent.email });

    const invalidTransition = await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: TicketStatus.Open });
    expect(invalidTransition.status).toBe(400);
    expect(invalidTransition.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('allows a valid status transition and records an audit event', async () => {
    const created = await createTicket();
    const { token } = await login('agent');

    await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/assignment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedTo: users.agent.email });

    const response = await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: TicketStatus.InProgress });
    expect(response.status).toBe(200);
    expect(response.body.auditLog.at(-1).action).toBe('STATUS_CHANGED');
  });

  it('calculates breached tickets dynamically on the dashboard', async () => {
    await createTicket();
    await TicketModel.updateOne({}, { $set: { slaDueAt: new Date(Date.now() - 1000) } });
    const { token } = await login('agent');
    const response = await request(app)
      .get('/api/v1/tickets/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(response.body.slaBreached).toBe(1);
  });

  it('supports pagination and priority filtering', async () => {
    await createTicket();
    await createTicket({ customerEmail: 'second@example.com', subject: 'Second support request' });
    const { token } = await login('agent');
    const response = await request(app)
      .get(`/api/v1/tickets?page=1&limit=1&priority=${TicketPriority.Medium}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.pagination.total).toBe(2);
  });

  it('stores a mocked AI summary with the generated flag', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    const response = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.ticket.conversations.at(-1).aiGenerated).toBe(true);
  });

  it('replaces the previous AI summary instead of appending a duplicate', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    const first = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/summary`)
      .set('Authorization', `Bearer ${token}`);
    const second = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(first.body.replaced).toBe(false);
    expect(second.body.replaced).toBe(true);
    expect(second.body.ticket.conversations.filter((item: any) => item.aiGenerated)).toHaveLength(
      1,
    );
    const stored = await TicketModel.findOne({ ticketNumber: created.body.ticketNumber });
    expect(stored?.conversations.filter((item) => item.aiGenerated)).toHaveLength(1);
  });

  it('degrades safely when the AI summary times out', async () => {
    const created = await createTicket();
    const { token } = await login('agent');
    ai.failSummary = true;
    const response = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AI_UNAVAILABLE');
    expect(await TicketModel.countDocuments()).toBe(1);
  });

  it('keeps automatic AI triage pending until human confirmation', async () => {
    const created = await createTicket();
    const ticket = await TicketModel.findOne({ ticketNumber: created.body.ticketNumber });
    expect(ticket?.priority).toBe(TicketPriority.Medium);
    expect(ticket?.aiTriage?.status).toBe(AiReviewStatus.PendingReview);
    const { token } = await login('agent');

    await request(app)
      .patch(`/api/v1/tickets/${created.body.ticketNumber}/assignment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedTo: users.agent.email });

    const response = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/triage/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accepted: true });
    expect(response.body.priority).toBe(TicketPriority.High);
    expect(response.body.aiTriage.status).toBe(AiReviewStatus.Accepted);
  });

  it('does not persist a fake recommendation when AI triage fails', async () => {
    const created = await createTicket();
    await TicketModel.updateOne(
      { ticketNumber: created.body.ticketNumber },
      { $unset: { aiTriage: 1 } },
    );
    ai.failTriage = true;
    const { token } = await login('agent');
    const response = await request(app)
      .post(`/api/v1/tickets/${created.body.ticketNumber}/ai/triage`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AI_UNAVAILABLE');
    const stored = await TicketModel.findOne({ ticketNumber: created.body.ticketNumber });
    expect(stored?.aiTriage).toBeUndefined();
  });
});
