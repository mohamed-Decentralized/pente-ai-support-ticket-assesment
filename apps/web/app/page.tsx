'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { coreOrigin, reportingOrigin } from '../lib/api';

export default function HomePage() {
  const [health, setHealth] = useState({ core: 'Checking', reporting: 'Checking' });

  useEffect(() => {
    const check = async () => {
      const [core, reporting] = await Promise.allSettled([
        fetch(`${coreOrigin}/health/liveness`).then((response) => response.ok),
        fetch(`${reportingOrigin}/health/liveness`).then((response) => response.ok),
      ]);
      setHealth({
        core: core.status === 'fulfilled' && core.value ? 'Available' : 'Unavailable',
        reporting:
          reporting.status === 'fulfilled' && reporting.value ? 'Available' : 'Unavailable',
      });
    };
    void check();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="eyebrow">Pente Support</div>
        <h1>How can we help today?</h1>
        <p>
          Customers can ask for help or check an existing request. Support staff can sign in to
          manage tickets.
        </p>
      </section>
      <section className="entryGrid" aria-label="Choose how to continue">
        <article className="entryCard customerEntry">
          <div>
            <span className="eyebrow">For customers</span>
            <h2>I need help</h2>
            <p>Create a support request or use your email address to follow an existing one.</p>
          </div>
          <div className="entryActions">
            <Link className="button primary" href="/tickets/create">
              Create a ticket
            </Link>
            <Link className="button secondary" href="/tickets/lookup">
              Find my tickets
            </Link>
          </div>
        </article>
        <article className="entryCard staffEntry">
          <div>
            <span className="eyebrow">For agents and administrators</span>
            <h2>I manage support</h2>
            <p>Sign in to review queues, reply to customers, manage SLAs, and view reports.</p>
          </div>
          <div className="entryActions">
            <Link className="button staffButton" href="/login">
              Staff sign in
            </Link>
          </div>
        </article>
      </section>
      <section className="serviceStrip" aria-label="Service health">
        <span>
          Core API <strong>{health.core}</strong>
        </span>
        <span>
          Reporting <strong>{health.reporting}</strong>
        </span>
      </section>
    </>
  );
}
