export enum UserRole {
  Agent = 'Agent',
  Admin = 'Admin',
}

export enum AuthorType {
  Customer = 'Customer',
  Agent = 'Agent',
  Admin = 'Admin',
}

export enum TicketPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum TicketStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  WaitingForCustomer = 'Waiting for Customer',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum AiReviewStatus {
  PendingReview = 'Pending Review',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  Failed = 'Failed',
}

export const slaHours: Record<TicketPriority, number> = {
  [TicketPriority.Critical]: 4,
  [TicketPriority.High]: 8,
  [TicketPriority.Medium]: 24,
  [TicketPriority.Low]: 48,
};

export const terminalStatuses = [TicketStatus.Resolved, TicketStatus.Closed];

export const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.Open]: [TicketStatus.InProgress, TicketStatus.Closed],
  [TicketStatus.InProgress]: [
    TicketStatus.WaitingForCustomer,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
  [TicketStatus.WaitingForCustomer]: [TicketStatus.InProgress, TicketStatus.Resolved],
  [TicketStatus.Resolved]: [TicketStatus.Closed, TicketStatus.InProgress],
  [TicketStatus.Closed]: [],
};
