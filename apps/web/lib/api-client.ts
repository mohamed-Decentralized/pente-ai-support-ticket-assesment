import { AuthUser, TicketView } from '@pente/shared';
import { apiRequest } from './api';

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  slaBreached: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TicketPage {
  items: TicketView[];
  pagination: Pagination;
}

export interface StaffMember {
  name: string;
  email: string;
  role: string;
}

export interface StaffPage {
  items: StaffMember[];
  pagination: Pagination;
}

export interface AuditLogEntry {
  action: string;
  performedBy: string;
  role: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  pagination: Pagination;
}

export const apiClient = {
  // Auth
  login: (credentials: Record<string, string>) =>
    apiRequest<{ user: AuthUser; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  // Public Tickets
  createPublicTicket: (data: Record<string, string>) =>
    apiRequest<{ ticketNumber: string }>('/public/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  lookupPublicTickets: (email: string, page: number) =>
    apiRequest<{ items: TicketView[]; pagination: any }>('/public/tickets/lookup', {
      method: 'POST',
      body: JSON.stringify({ email, page, limit: 25 }),
    }),
  getPublicTicket: (ticketNumber: string, email: string) =>
    apiRequest<TicketView>(`/public/tickets/${ticketNumber}/details`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  replyToPublicTicket: (ticketNumber: string, email: string, message: string) =>
    apiRequest<TicketView>(`/public/tickets/${ticketNumber}/replies`, {
      method: 'POST',
      body: JSON.stringify({ email, message }),
    }),

  // Staff Tickets
  getDashboardStats: () => apiRequest<DashboardStats>('/tickets/dashboard'),
  listTickets: (query: string) => apiRequest<TicketPage>(`/tickets?${query}`),
  getTicket: (ticketNumber: string) => apiRequest<TicketView>(`/tickets/${ticketNumber}`),
  getStaffMembers: (page = 1, limit = 100) =>
    apiRequest<StaffPage>(`/tickets/staff?page=${page}&limit=${limit}`),
  getTicketAuditLog: (ticketNumber: string, page = 1, limit = 10) =>
    apiRequest<AuditLogPage>(`/tickets/${ticketNumber}/audit-log?page=${page}&limit=${limit}`),
  replyToTicket: (ticketNumber: string, message: string) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/replies`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  updateTicketStatus: (ticketNumber: string, status: string) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateTicketAssignment: (ticketNumber: string, assignedTo: string) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTo }),
    }),
  updateTicketPriority: (ticketNumber: string, priority: string) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),
  deleteTicket: (ticketNumber: string) =>
    apiRequest(`/tickets/${ticketNumber}`, { method: 'DELETE' }),

  // AI
  generateAiSummary: (ticketNumber: string) =>
    apiRequest<{ ticket: TicketView; replaced: boolean }>(`/tickets/${ticketNumber}/ai/summary`, {
      method: 'POST',
    }),
  generateAiTriage: (ticketNumber: string) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/ai/triage`, { method: 'POST' }),
  reviewAiTriage: (ticketNumber: string, accepted: boolean) =>
    apiRequest<TicketView>(`/tickets/${ticketNumber}/ai/triage/review`, {
      method: 'POST',
      body: JSON.stringify({ accepted }),
    }),
};
