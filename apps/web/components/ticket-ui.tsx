import { TicketPriority, TicketStatus } from '@pente/shared';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge priority-${priority.toLowerCase()}`}>{priority}</span>;
}

export function SlaBadge({ dueAt, breached }: { dueAt: string; breached: boolean }) {
  const deadline = new Date(dueAt);
  const minutes = Math.round(Math.abs(deadline.getTime() - Date.now()) / 60000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return (
    <span className={`sla ${breached ? 'slaBreached' : ''}`}>
      {breached ? 'Breached' : 'Due'} · {hours}h {remainder}m {breached ? 'overdue' : 'remaining'}
    </span>
  );
}
