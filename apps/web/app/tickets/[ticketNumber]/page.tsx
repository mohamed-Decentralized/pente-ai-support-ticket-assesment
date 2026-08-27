'use client';

import { TicketView } from '@pente/shared';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StatusBadge } from '../../../components/ticket-ui';
import { FieldError, validationAttributes } from '../../../components/field-error';
import { ApiError } from '../../../lib/api';
import { apiClient } from '../../../lib/api-client';

export default function CustomerTicketPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const load = async () => {
    const email = sessionStorage.getItem('pente_customer_email');
    if (!email) {
      router.replace('/tickets/lookup');
      return;
    }
    try {
      setTicket(await apiClient.getPublicTicket(ticketNumber, email));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load this ticket.');
    }
  };

  useEffect(() => {
    void load();
  }, [ticketNumber]);

  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = sessionStorage.getItem('pente_customer_email');
    if (!email) return;
    setSending(true);
    setError('');
    setFieldErrors({});
    try {
      const data = new FormData(form);
      setTicket(
        await apiClient.replyToPublicTicket(ticketNumber, email, data.get('message') as string),
      );
      form.reset();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.details?.fieldErrors) {
          setFieldErrors(caught.details.fieldErrors);
          setError('Please check the form for errors.');
        } else {
          setError(caught.message);
        }
      } else {
        setError('Could not send your reply.');
      }
    } finally {
      setSending(false);
    }
  };

  if (error && !ticket)
    return (
      <section className="pageShell">
        <div className="errorPanel">{error}</div>
      </section>
    );
  if (!ticket)
    return (
      <section className="pageShell">
        <div className="statePanel">Loading ticket…</div>
      </section>
    );

  return (
    <section className="pageShell">
      <div className="ticketHeading">
        <div>
          <span className="mono">{ticket.ticketNumber}</span>
          <h1>{ticket.subject}</h1>
        </div>
        <div className="badgeRow">
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <article className="descriptionCard">
        <h2>Original request</h2>
        <p>{ticket.description}</p>
      </article>
      <section className="conversation">
        <h2>Conversation</h2>
        {ticket.conversations.map((message, index) => (
          <article
            className={`message ${message.authorType === 'Customer' ? 'staffMessage' : 'customerMessage'}`}
            key={message.id ?? index}
          >
            <div>
              <strong>{message.authorType}</strong>
              <time>{new Date(message.timestamp).toLocaleString()}</time>
            </div>
            <p>{message.message}</p>
          </article>
        ))}
      </section>
      {ticket.status !== 'Closed' && (
        <form className="replyForm" onSubmit={reply}>
          <label>
            Your reply
            <textarea
              name="message"
              required
              maxLength={5000}
              rows={4}
              {...validationAttributes('err-message', fieldErrors.message)}
            />
            <FieldError id="err-message" message={fieldErrors.message} />
          </label>
          {error && <div className="errorPanel">{error}</div>}
          <button className="button primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </form>
      )}
    </section>
  );
}
