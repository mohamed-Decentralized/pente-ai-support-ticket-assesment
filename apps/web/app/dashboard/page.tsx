'use client';

import { TicketPriority, TicketStatus } from '@pente/shared';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { StaffGate } from '../../components/staff-gate';
import { useToast } from '../../components/toast-provider';
import { PriorityBadge, SlaBadge, StatusBadge } from '../../components/ticket-ui';
import { ApiError } from '../../lib/api';
import { apiClient, DashboardStats, TicketPage } from '../../lib/api-client';

const priorities = Object.values(TicketPriority);
const statuses = Object.values(TicketStatus);

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<TicketPage | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    slaBreached: '',
    page: '1',
  });
  const [activeFilters, setActiveFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    query.set('limit', '10');
    try {
      const [nextStats, nextTickets] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.listTickets(query.toString()),
      ]);
      setStats(nextStats);
      setTickets(nextTickets);
    } catch (caught) {
      console.log('load_dashboard_error', caught);
      addToast(
        caught instanceof ApiError ? caught.message : 'Could not load the dashboard.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilters, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setActiveFilters({ ...filters, page: '1' });
  };

  const setPage = (page: number) => {
    setFilters((current) => ({ ...current, page: String(page) }));
    setActiveFilters((current) => ({ ...current, page: String(page) }));
  };

  const cards = stats
    ? [
        ['Total', stats.total],
        ['Open', stats.open],
        ['In progress', stats.inProgress],
        ['Waiting', stats.waiting],
        ['Resolved', stats.resolved],
        ['SLA breached', stats.slaBreached],
      ]
    : [];

  return (
    <section className="pageShell wide">
      <div className="pageTitleRow">
        <div>
          <div className="eyebrow">Operations</div>
          <h1>Ticket dashboard</h1>
        </div>
        <button className="button secondary" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {stats && (
        <div className="statGrid">
          {cards.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
      <form className="filterBar" onSubmit={applyFilters}>
        <label>
          Search
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Ticket, subject, or email"
          />
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label>
          SLA
          <select
            value={filters.slaBreached}
            onChange={(event) => setFilters({ ...filters, slaBreached: event.target.value })}
          >
            <option value="">Any SLA</option>
            <option value="true">Breached</option>
            <option value="false">On track</option>
          </select>
        </label>
        <button className="button primary">Apply</button>
      </form>
      {loading && <div className="statePanel">Loading tickets…</div>}
      {!loading && tickets?.items.length === 0 && (
        <div className="statePanel">No tickets match these filters.</div>
      )}
      {!loading && tickets && tickets.items.length > 0 && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {tickets.items.map((ticket) => (
                <tr key={ticket.ticketNumber}>
                  <td>
                    <Link
                      href={`/staff/tickets/${ticket.ticketNumber}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                    >
                      <div>
                        <span className="mono">{ticket.ticketNumber}</span>
                      </div>
                      <strong style={{ fontSize: '15px' }}>{ticket.subject}</strong>
                    </Link>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {ticket.customerName}
                      </span>
                      <small style={{ color: 'var(--text-muted)' }}>{ticket.customerEmail}</small>
                    </div>
                  </td>
                  <td>
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <SlaBadge dueAt={ticket.slaDueAt} breached={ticket.slaBreached} />
                  </td>
                  <td>{ticket.assignedTo ?? 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tickets && tickets.pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={tickets.pagination.page <= 1}
            onClick={() => setPage(tickets.pagination.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {tickets.pagination.page} of {tickets.pagination.pages}
          </span>
          <button
            disabled={tickets.pagination.page >= tickets.pagination.pages}
            onClick={() => setPage(tickets.pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <StaffGate>
      <DashboardContent />
    </StaffGate>
  );
}
