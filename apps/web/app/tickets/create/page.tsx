'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { apiClient } from '../../../lib/api-client';
import { FieldError, validationAttributes } from '../../../components/field-error';

export default function CreateTicketPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ticketNumber, setTicketNumber] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const ticket = await apiClient.createPublicTicket({
        customerName: form.get('customerName') as string,
        customerEmail: form.get('customerEmail') as string,
        subject: form.get('subject') as string,
        description: form.get('description') as string,
      });
      setTicketNumber(ticket.ticketNumber);
      formElement.reset();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.details?.fieldErrors) {
          setFieldErrors(caught.details.fieldErrors);
          setError('Please check the form for errors.');
        } else {
          setError(caught.message);
        }
      } else {
        setError('Could not create your ticket.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pageShell narrow">
      <div className="eyebrow">New request</div>
      <h1>How can we help?</h1>
      <p className="lede">
        Share the essentials. Your request starts at Medium priority while staff review it.
      </p>
      {ticketNumber && (
        <div className="successPanel" role="status">
          <strong>Ticket {ticketNumber} is ready.</strong>
          <span>Use your email on the lookup page to follow it.</span>
          <Link href="/tickets/lookup">Find this ticket</Link>
        </div>
      )}
      <form className="formCard" onSubmit={submit}>
        <label>
          Full name
          <input
            name="customerName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            {...validationAttributes('err-name', fieldErrors.customerName)}
          />
          <FieldError id="err-name" message={fieldErrors.customerName} />
        </label>
        <label>
          Email address
          <input
            name="customerEmail"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            {...validationAttributes('err-email', fieldErrors.customerEmail)}
          />
          <FieldError id="err-email" message={fieldErrors.customerEmail} />
        </label>
        <label>
          Subject
          <input
            name="subject"
            required
            minLength={3}
            maxLength={160}
            {...validationAttributes('err-subject', fieldErrors.subject)}
          />
          <FieldError id="err-subject" message={fieldErrors.subject} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={5000}
            rows={7}
            {...validationAttributes('err-desc', fieldErrors.description)}
          />
          <FieldError id="err-desc" message={fieldErrors.description} />
        </label>
        {error && (
          <div className="errorPanel" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </section>
  );
}
