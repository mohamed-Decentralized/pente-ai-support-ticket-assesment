'use client';

import { useEffect, useState } from 'react';
import { StaffGate } from '../../components/staff-gate';
import { reportRequest, ApiError } from '../../lib/api';
import styles from './reports.module.css';
import Link from 'next/link';

interface Overview {
  data: {
    total: number;
    byStatus: Array<{ _id: string; count: number }>;
    byPriority: Array<{ _id: string; count: number }>;
  };
  cache: string;
  ttlMs: number;
}

interface Breach {
  ticketNumber: string;
  subject: string;
  priority: string;
  status: string;
  assignedTo?: string;
  slaDueAt: string;
  state: string;
  minutesFromDeadline: number;
}

interface SlaBreachesPage {
  items: Breach[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

function getBarClass(type: 'priority' | 'status', value: string) {
  if (type === 'priority') {
    switch (value.toLowerCase()) {
      case 'critical':
        return styles.barCritical;
      case 'high':
        return styles.barHigh;
      case 'medium':
        return styles.barMedium;
      case 'low':
        return styles.barLow;
      default:
        return styles.barMedium;
    }
  } else {
    switch (value.toLowerCase()) {
      case 'open':
        return styles.barOpen;
      case 'in progress':
        return styles.barInProgress;
      case 'waiting for customer':
        return styles.barWaiting;
      case 'resolved':
        return styles.barResolved;
      default:
        return styles.barOpen;
    }
  }
}

function ReportsContent() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [breachesPage, setBreachesPage] = useState<SlaBreachesPage | null>(null);
  const [breachesPageNum, setBreachesPageNum] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [nextOverview, nextBreaches] = await Promise.all([
          reportRequest<Overview>('/reports/overview'),
          reportRequest<SlaBreachesPage>(`/reports/sla-breaches?page=${breachesPageNum}&limit=10`),
        ]);
        setOverview(nextOverview);
        setBreachesPage(nextBreaches);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not load reports.');
      }
    };
    void load();
  }, [breachesPageNum]);

  return (
    <section className="pageShell wide">
      <div className={styles.header}>
        <div>
          <div className="eyebrow">Admin reporting</div>
          <h1>Service health at a glance</h1>
          <p className="lede">Operational aggregates from the reporting service.</p>
        </div>
        {overview && (
          <div className={styles.headerMeta}>
            <div className={styles.badge}>
              Total Tickets: <strong>{overview.data.total}</strong>
            </div>
            <div className={styles.badge}>
              Cache: <strong>{overview.cache}</strong> ({overview.ttlMs / 1000}s)
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="errorPanel" role="alert">
          {error}
        </div>
      )}

      {!overview && !error && <div className="statePanel">Loading dashboard…</div>}

      {overview && (
        <div className={styles.grid}>
          <article className={styles.card}>
            <h2>Tickets by Status</h2>
            {overview.data.byStatus.map((item) => {
              const percentage = Math.round((item.count / overview.data.total) * 100) || 0;
              return (
                <div className={styles.chartRow} key={item._id}>
                  <div className={styles.chartLabel}>
                    <span>{item._id}</span>
                    <strong>
                      {item.count} <span style={{ opacity: 0.5 }}>({percentage}%)</span>
                    </strong>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      className={`${styles.chartBar} ${getBarClass('status', item._id)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </article>

          <article className={styles.card}>
            <h2>Tickets by Priority</h2>
            {overview.data.byPriority.map((item) => {
              const percentage = Math.round((item.count / overview.data.total) * 100) || 0;
              return (
                <div className={styles.chartRow} key={item._id}>
                  <div className={styles.chartLabel}>
                    <span>{item._id}</span>
                    <strong>
                      {item.count} <span style={{ opacity: 0.5 }}>({percentage}%)</span>
                    </strong>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      className={`${styles.chartBar} ${getBarClass('priority', item._id)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </article>
        </div>
      )}

      <section>
        <h2 className={styles.sectionTitle}>
          SLA Attention Queue {breachesPage ? `· ${breachesPage.pagination.total} Tickets` : ''}
        </h2>
        {!breachesPage || breachesPage.items.length === 0 ? (
          <div className="statePanel">No breached or approaching tickets. Excellent work!</div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Priority</th>
                  <th>SLA Status</th>
                  <th>Owner</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {breachesPage.items.map((ticket) => {
                  const isBreached = ticket.state === 'breached';
                  return (
                    <tr key={ticket.ticketNumber} className={isBreached ? styles.urgentPulse : ''}>
                      <td>
                        <Link href={`/staff/tickets/${ticket.ticketNumber}`}>
                          <strong>{ticket.ticketNumber}</strong>
                          <small>{ticket.subject}</small>
                        </Link>
                      </td>
                      <td>{ticket.priority}</td>
                      <td>
                        <span
                          className={`badge ${isBreached ? 'priority-critical' : 'priority-high'}`}
                        >
                          {ticket.state}
                        </span>
                      </td>
                      <td>{ticket.assignedTo ?? 'Unassigned'}</td>
                      <td>
                        {new Date(ticket.slaDueAt).toLocaleString()}
                        <small>
                          {isBreached ? (
                            <span className={styles.overdueTag}>
                              {Math.abs(ticket.minutesFromDeadline)} mins overdue
                            </span>
                          ) : (
                            <span className={styles.remainingTag}>
                              {Math.abs(ticket.minutesFromDeadline)} mins remaining
                            </span>
                          )}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {breachesPage.pagination.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={breachesPage.pagination.page <= 1}
                  onClick={() => setBreachesPageNum(breachesPage.pagination.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <span>
                  Page {breachesPage.pagination.page} of {breachesPage.pagination.pages}
                </span>
                <button
                  disabled={breachesPage.pagination.page >= breachesPage.pagination.pages}
                  onClick={() => setBreachesPageNum(breachesPage.pagination.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default function ReportsPage() {
  return (
    <StaffGate adminOnly>
      <ReportsContent />
    </StaffGate>
  );
}
