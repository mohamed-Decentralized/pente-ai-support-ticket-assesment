'use client';

import { TicketView } from '@pente/shared';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { StatusBadge } from '../../../components/ticket-ui';
import { ApiError } from '../../../lib/api';
import { apiClient, Pagination } from '../../../lib/api-client';
import { FieldError, validationAttributes } from '../../../components/field-error';

export default function LookupPage() {
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    const targetEmail = String(new FormData(event.currentTarget).get('email'));
    setEmail(targetEmail);
    await loadPage(targetEmail, 1);
  };

  const loadPage = async (targetEmail: string, page: number) => {
    try {
      const result = await apiClient.lookupPublicTickets(targetEmail, page);
      sessionStorage.setItem('pente_customer_email', targetEmail.toLowerCase());
      setTickets(result.items);
      setPagination(result.pagination);
      setSearched(true);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.details?.fieldErrors) {
          setFieldErrors(caught.details.fieldErrors);
          setError('Please check the form for errors.');
        } else {
          setError(caught.message);
        }
      } else {
        setError('Could not look up tickets.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pageShell">
      <div className="eyebrow">Customer portal</div>
      <h1>Find your tickets</h1>
      <p className="lede">Enter the same email address you used when creating your request.</p>
      <form className="lookupBar" onSubmit={submit}>
        <label>
          <span>Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            {...validationAttributes('err-email', fieldErrors.email)}
          />
          <FieldError id="err-email" message={fieldErrors.email} />
        </label>
        <button className="button primary" disabled={loading}>
          {loading ? 'Searching…' : 'Find tickets'}
        </button>
      </form>
      {error && (
        <div className="errorPanel" role="alert">
          {error}
        </div>
      )}
      {searched && tickets.length === 0 && (
        <div className="statePanel">No tickets were found for that email address.</div>
      )}
      <div className="ticketList">
        {tickets.map((ticket) => (
          <Link
            className="ticketCard"
            href={`/tickets/${ticket.ticketNumber}`}
            key={ticket.ticketNumber}
          >
            <div>
              <span className="mono">{ticket.ticketNumber}</span>
              <h2>{ticket.subject}</h2>
            </div>
            <div className="badgeRow">
              <StatusBadge status={ticket.status} />
            </div>
            <time>{new Date(ticket.createdAt).toLocaleDateString()}</time>
          </Link>
        ))}
      </div>
      {pagination && pagination.pages > 1 && (
        <div className="pagination" style={{ marginTop: '24px' }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => void loadPage(email, pagination.page - 1)}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => void loadPage(email, pagination.page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
