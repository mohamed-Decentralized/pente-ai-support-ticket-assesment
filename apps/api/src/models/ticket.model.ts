import { AiReviewStatus, AuthorType, TicketPriority, TicketStatus, UserRole } from '@pente/shared';
import { InferSchemaType, Schema, model } from 'mongoose';

const conversationSchema = new Schema(
  {
    authorType: { type: String, enum: Object.values(AuthorType), required: true },
    authorEmail: { type: String, required: true, lowercase: true },
    message: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    aiGenerated: { type: Boolean, default: false },
  },
  { _id: true },
);

const auditSchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    role: {
      type: String,
      enum: [...Object.values(AuthorType), 'System'],
      required: true,
    },
    field: { type: String },
    previousValue: { type: String },
    newValue: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const aiTriageSchema = new Schema(
  {
    suggestedPriority: { type: String, enum: Object.values(TicketPriority), required: true },
    suggestedCategory: { type: String, required: true },
    reason: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    status: { type: String, enum: Object.values(AiReviewStatus), required: true },
    generatedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: Object.values(TicketPriority), required: true },
    status: { type: String, enum: Object.values(TicketStatus), required: true },
    slaDueAt: { type: Date, required: true, index: true },
    assignedTo: { type: String, lowercase: true, index: true },
    resolvedAt: { type: Date },
    conversations: { type: [conversationSchema], default: [] },
    auditLog: { type: [auditSchema], default: [] },
    aiTriage: { type: aiTriageSchema },
  },
  { timestamps: true },
);

ticketSchema.index({ subject: 'text', description: 'text', ticketNumber: 'text' });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export type TicketDocument = InferSchemaType<typeof ticketSchema>;
export const TicketModel = model('Ticket', ticketSchema);
