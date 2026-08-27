import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AuthorType, TicketPriority, TicketStatus, UserRole } from '@pente/shared';
import { loadEnv } from '../config/env';
import { calculateSlaDueAt } from '../lib/sla';
import { CounterModel } from '../models/counter.model';
import { TicketModel } from '../models/ticket.model';
import { UserModel } from '../models/user.model';

const run = async () => {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const passwordHash = await bcrypt.hash('PenteDemo123!', 12);
  await UserModel.bulkWrite([
    {
      updateOne: {
        filter: { email: 'bob@pente.ai' },
        update: {
          name: 'Bob Agent',
          email: 'bob@pente.ai',
          passwordHash,
          role: UserRole.Agent,
          active: true,
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { email: 'alice@pente.ai' },
        update: {
          name: 'Alice Agent',
          email: 'alice@pente.ai',
          passwordHash,
          role: UserRole.Agent,
          active: true,
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { email: 'dave@pente.ai' },
        update: {
          name: 'Dave Agent',
          email: 'dave@pente.ai',
          passwordHash,
          role: UserRole.Agent,
          active: true,
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { email: 'charlie@pente.ai' },
        update: {
          name: 'Charlie Admin',
          email: 'charlie@pente.ai',
          passwordHash,
          role: UserRole.Admin,
          active: true,
        },
        upsert: true,
      },
    },
  ]);
  await CounterModel.findByIdAndUpdate('ticket', { $max: { sequence: 1002 } }, { upsert: true });
  const createdAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
  const tickets = [
    {
      ticketNumber: 'TKT-1001',
      customerName: 'Alice Customer',
      customerEmail: 'alice@example.com',
      subject: 'Payment deducted after failed checkout',
      description: 'My subscription payment failed but the amount was deducted from my account.',
      priority: TicketPriority.High,
      status: TicketStatus.InProgress,
      slaDueAt: calculateSlaDueAt(TicketPriority.High, createdAt),
      assignedTo: 'bob@pente.ai',
      createdAt,
      conversations: [
        {
          authorType: AuthorType.Customer,
          authorEmail: 'alice@example.com',
          message: 'My subscription payment failed but the amount was deducted from my account.',
          timestamp: createdAt,
          aiGenerated: false,
        },
      ],
      auditLog: [
        {
          action: 'TICKET_CREATED',
          performedBy: 'alice@example.com',
          role: AuthorType.Customer,
          timestamp: createdAt,
        },
      ],
    },
    {
      ticketNumber: 'TKT-1002',
      customerName: 'Maya Customer',
      customerEmail: 'maya@example.com',
      subject: 'Need help changing company address',
      description: 'Please help me update the company address shown on future invoices.',
      priority: TicketPriority.Low,
      status: TicketStatus.Open,
      slaDueAt: calculateSlaDueAt(TicketPriority.Low, new Date()),
      conversations: [
        {
          authorType: AuthorType.Customer,
          authorEmail: 'maya@example.com',
          message: 'Please help me update the company address shown on future invoices.',
          timestamp: new Date(),
          aiGenerated: false,
        },
      ],
      auditLog: [
        {
          action: 'TICKET_CREATED',
          performedBy: 'maya@example.com',
          role: AuthorType.Customer,
          timestamp: new Date(),
        },
      ],
    },
  ];
  for (const ticket of tickets) {
    await TicketModel.updateOne(
      { ticketNumber: ticket.ticketNumber },
      { $set: ticket },
      { upsert: true },
    );
  }
  process.stdout.write('Seed complete. Staff password: PenteDemo123!\n');
  await mongoose.disconnect();
};

run().catch((error) => {
  process.stderr.write(
    `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
