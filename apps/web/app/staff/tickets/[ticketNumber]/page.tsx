'use client';

import { AiReviewStatus, TicketPriority, TicketStatus, TicketView } from '@pente/shared';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../components/auth-provider';
import { FieldError, validationAttributes } from '../../../../components/field-error';
import { useToast } from '../../../../components/toast-provider';
import { StaffGate } from '../../../../components/staff-gate';
import { PriorityBadge, SlaBadge, StatusBadge } from '../../../../components/ticket-ui';
import { ApiError } from '../../../../lib/api';
import { apiClient, StaffMember, AuditLogPage } from '../../../../lib/api-client';

function TicketContent() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [auditLogPage, setAuditLogPage] = useState<AuditLogPage | null>(null);
  const [busy, setBusy] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextTicket, nextStaff, nextAuditLog] = await Promise.all([
        apiClient.getTicket(ticketNumber),
        apiClient.getStaffMembers(1, 100),
        apiClient.getTicketAuditLog(ticketNumber, 1, 10),
      ]);
      setTicket(nextTicket);
      setStaff(nextStaff.items);
      setAuditLogPage(nextAuditLog);
    } catch (caught) {
      addToast(
        caught instanceof ApiError ? caught.message : 'Could not load this ticket.',
        'error',
      );
    }
  }, [ticketNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (name: string, action: () => Promise<TicketView>, success: string) => {
    setBusy(name);
    try {
      setTicket(await action());
      addToast(success, 'success');
    } catch (caught) {
      addToast(
        caught instanceof ApiError ? caught.message : 'The action could not be completed.',
        'error',
      );
    } finally {
      setBusy('');
    }
  };

  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get('message') as string;

    setBusy('reply');
    setFieldErrors({});
    try {
      const updated = await apiClient.replyToTicket(ticketNumber, message);
      setTicket({ ...ticket, ...updated });
      addToast('Reply sent.', 'success');
      form.reset();
    } catch (caught) {
      if (caught instanceof ApiError && caught.details?.fieldErrors) {
        setFieldErrors(caught.details.fieldErrors);
      } else {
        addToast(
          caught instanceof ApiError ? caught.message : 'The action could not be completed.',
          'error',
        );
      }
    } finally {
      setBusy('');
    }
  };

  const loadAuditPage = async (page: number) => {
    try {
      const nextLog = await apiClient.getTicketAuditLog(ticketNumber, page, 10);
      setAuditLogPage(nextLog);
    } catch {
      addToast('Could not load audit log page', 'error');
    }
  };

  if (!ticket) return <div className="statePanel">Loading ticket…</div>;

  const latestSummaryIndex = ticket.conversations.reduce(
    (latest, message, index) => (message.aiGenerated ? index : latest),
    -1,
  );
  const summaryMessage = latestSummaryIndex >= 0 ? ticket.conversations[latestSummaryIndex] : null;
  const chatConversations = ticket.conversations.filter((message) => !message.aiGenerated);
  const hasSummary = Boolean(summaryMessage);
  const isClosed = ticket.status === TicketStatus.Closed;
  const isAgent = user?.role === 'Agent';
  const needsAssignment = !ticket.assignedTo;

  return (
    <section className="pageShell wide">
      {needsAssignment && (
        <div
          className="warningPanel"
          role="alert"
          style={{
            marginBottom: '1rem',
            borderLeft: '4px solid var(--warning)',
            backgroundColor: 'var(--warning-light)',
            padding: '16px',
            borderRadius: '8px',
            color: 'var(--text-main)',
          }}
        >
          <strong>Action Required:</strong> You must assign this ticket before you can change its
          status, generate AI insights, or reply to the customer.
        </div>
      )}
      <div className="ticketHeading">
        <div>
          <span className="mono">{ticket.ticketNumber}</span>
          <h1>{ticket.subject}</h1>
          <p>
            {ticket.customerName} · {ticket.customerEmail}
          </p>
        </div>
        <div className="badgeRow">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <SlaBadge dueAt={ticket.slaDueAt} breached={ticket.slaBreached} />
      <div className="staffGrid">
        <aside className="controlPanel">
          <h2>Ticket controls</h2>
          <label>
            Status
            <select
              value={ticket.status}
              onChange={(event) =>
                void run(
                  'status',
                  () => apiClient.updateTicketStatus(ticketNumber, event.target.value),
                  'Status updated.',
                )
              }
              disabled={isClosed || Boolean(busy) || needsAssignment}
            >
              {Object.values(TicketStatus).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              value={ticket.assignedTo ?? ''}
              onChange={(event) =>
                void run(
                  'assignment',
                  () => apiClient.updateTicketAssignment(ticketNumber, event.target.value),
                  'Assignment updated.',
                )
              }
              disabled={isClosed || Boolean(busy) || (isAgent && Boolean(ticket.assignedTo))}
            >
              <option value="" disabled>
                Unassigned
              </option>
              {staff
                .filter((member) => user?.role === 'Admin' || member.email === user?.email)
                .map((member) => (
                  <option key={member.email} value={member.email}>
                    {member.name} · {member.role}
                  </option>
                ))}
            </select>
          </label>
          {user?.role === 'Admin' && (
            <label>
              Priority
              <select
                value={ticket.priority}
                onChange={(event) =>
                  void run(
                    'priority',
                    () => apiClient.updateTicketPriority(ticketNumber, event.target.value),
                    'Priority updated.',
                  )
                }
                disabled={isClosed || Boolean(busy)}
              >
                {Object.values(TicketPriority).map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button secondary"
            disabled={isClosed || Boolean(busy) || needsAssignment}
            onClick={() =>
              void run(
                'summary',
                async () => {
                  const res = await apiClient.generateAiSummary(ticketNumber);
                  setIsSummaryOpen(true);
                  return res.ticket;
                },
                hasSummary ? 'AI summary refreshed.' : 'AI summary created.',
              )
            }
          >
            {busy === 'summary'
              ? hasSummary
                ? 'Refreshing summary…'
                : 'Creating summary…'
              : hasSummary
                ? 'Refresh AI summary'
                : 'Create AI summary'}
          </button>
          <details className="moreActions">
            <summary>Additional actions</summary>
            {ticket.aiTriage?.status !== AiReviewStatus.Failed && (
              <button
                className="button secondary"
                disabled={isClosed || Boolean(busy) || needsAssignment}
                onClick={() =>
                  void run(
                    'triage',
                    () => apiClient.generateAiTriage(ticketNumber),
                    'AI recommendation refreshed.',
                  )
                }
              >
                {busy === 'triage' ? 'Analyzing…' : 'Refresh AI recommendation'}
              </button>
            )}
            {user?.role === 'Admin' && (
              <button
                className="button danger"
                disabled={Boolean(busy)}
                onClick={async () => {
                  if (!window.confirm(`Delete ${ticket.ticketNumber}?`)) return;
                  setBusy('delete');
                  try {
                    await apiClient.deleteTicket(ticketNumber);
                    addToast('Ticket deleted successfully.', 'success');
                    router.push('/dashboard');
                  } catch (caught) {
                    addToast(
                      caught instanceof ApiError ? caught.message : 'Could not delete ticket.',
                      'error',
                    );
                    setBusy('');
                  }
                }}
              >
                Delete ticket
              </button>
            )}
          </details>
        </aside>
        <div>
          <article className="descriptionCard">
            <h2>Original request</h2>
            <p>{ticket.description}</p>
          </article>
          {ticket.aiTriage?.status === AiReviewStatus.Failed && (
            <article className="triageCard triageFailed">
              <div>
                <span className="eyebrow">AI triage unavailable</span>
                <h2>No recommendation was applied</h2>
                <p>
                  The ticket remains at its current priority. Retry the analysis without affecting
                  the rest of the workflow.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={Boolean(busy) || needsAssignment}
                onClick={() =>
                  void run(
                    'triage',
                    () => apiClient.generateAiTriage(ticketNumber),
                    'AI recommendation created.',
                  )
                }
              >
                {busy === 'triage' ? 'Analyzing…' : 'Retry analysis'}
              </button>
            </article>
          )}
          {ticket.aiTriage && ticket.aiTriage.status !== AiReviewStatus.Failed && (
            <article className="triageCard">
              <div>
                <span className="eyebrow">AI recommendation · {ticket.aiTriage.status}</span>
                <h2>
                  {ticket.aiTriage.suggestedPriority} ·{' '}
                  {ticket.aiTriage.suggestedCategory.replace(/&amp;/g, '&')}
                </h2>
                <p>{ticket.aiTriage.reason}</p>
                <small>{Math.round(ticket.aiTriage.confidence * 100)}% confidence</small>
              </div>
              {ticket.aiTriage.status === AiReviewStatus.PendingReview && (
                <div className="actionRow">
                  <button
                    className="button primary"
                    disabled={Boolean(busy) || needsAssignment}
                    onClick={() =>
                      void run(
                        'accept',
                        () => apiClient.reviewAiTriage(ticketNumber, true),
                        'AI recommendation accepted after human review.',
                      )
                    }
                  >
                    Confirm {ticket.aiTriage.suggestedPriority}
                  </button>
                  <button
                    className="button secondary"
                    disabled={Boolean(busy) || needsAssignment}
                    onClick={() =>
                      void run(
                        'reject',
                        () => apiClient.reviewAiTriage(ticketNumber, false),
                        'AI recommendation rejected.',
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          )}
          {summaryMessage && (
            <button className="summaryBanner" onClick={() => setIsSummaryOpen(true)}>
              ✨ AI Summary Available — Click to view
            </button>
          )}
          <section className="conversation">
            <h2>Conversation</h2>
            {chatConversations.map((message, index) => (
              <article
                className={`message ${message.authorType === 'Customer' ? 'customerMessage' : 'staffMessage'}`}
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
          {ticket.status !== TicketStatus.Closed && (
            <form className="replyForm" onSubmit={reply}>
              <label>
                Reply to customer
                <textarea
                  name="message"
                  required
                  maxLength={5000}
                  rows={4}
                  disabled={needsAssignment}
                  {...validationAttributes('err-message', fieldErrors.message)}
                />
                <FieldError id="err-message" message={fieldErrors.message} />
              </label>
              <button className="button primary" disabled={Boolean(busy) || needsAssignment}>
                {busy === 'reply' ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          )}
          <details className="auditPanel">
            <summary>
              Audit history {auditLogPage ? `· ${auditLogPage.pagination.total} events` : ''}
            </summary>
            {auditLogPage?.items.map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`}>
                <strong>{entry.action.replaceAll('_', ' ')}</strong>
                <span>{entry.performedBy}</span>
                <time>{new Date(entry.timestamp).toLocaleString()}</time>
                {entry.field && (
                  <small>
                    {entry.field}: {entry.previousValue ?? 'none'} → {entry.newValue ?? 'none'}
                  </small>
                )}
              </div>
            ))}
            {auditLogPage && auditLogPage.pagination.pages > 1 && (
              <div className="pagination" style={{ marginTop: '16px' }}>
                <button
                  disabled={auditLogPage.pagination.page <= 1}
                  onClick={() => void loadAuditPage(auditLogPage.pagination.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <span>
                  Page {auditLogPage.pagination.page} of {auditLogPage.pagination.pages}
                </span>
                <button
                  disabled={auditLogPage.pagination.page >= auditLogPage.pagination.pages}
                  onClick={() => void loadAuditPage(auditLogPage.pagination.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            )}
          </details>
        </div>
      </div>
      {isSummaryOpen && summaryMessage && (
        <div className="modalOverlay" onClick={() => setIsSummaryOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>AI Summary</h2>
              <button className="button secondary" onClick={() => setIsSummaryOpen(false)}>
                Close
              </button>
            </div>
            <div className="aiSummaryContent">
              {summaryMessage.message
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => {
                  const isHeading =
                    line.startsWith('**') ||
                    ['Issue', 'Actions taken', 'Current situation', 'Next step'].includes(line);
                  return isHeading ? (
                    <h4 key={i}>{line.replace(/\*\*/g, '')}</h4>
                  ) : (
                    <p key={i}>{line}</p>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function StaffTicketPage() {
  return (
    <StaffGate>
      <TicketContent />
    </StaffGate>
  );
}
