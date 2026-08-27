import { AiReviewStatus, AuthorType, TicketPriority, TicketStatus, UserRole } from './constants';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ConversationMessage {
  id?: string;
  authorType: AuthorType;
  authorEmail: string;
  message: string;
  timestamp: string;
  aiGenerated?: boolean;
}

export interface AuditEntry {
  action: string;
  performedBy: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AiTriage {
  suggestedPriority: TicketPriority;
  suggestedCategory: string;
  reason: string;
  confidence: number;
  status: AiReviewStatus;
  generatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface TicketView {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaDueAt: string;
  slaBreached: boolean;
  assignedTo?: string;
  conversations: ConversationMessage[];
  auditLog?: AuditEntry[];
  aiTriage?: AiTriage;
  createdAt: string;
  updatedAt: string;
}
