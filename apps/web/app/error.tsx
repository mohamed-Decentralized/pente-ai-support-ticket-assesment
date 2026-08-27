'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error.digest;
  }, [error]);

  return (
    <section className="pageShell narrow">
      <div className="eyebrow">Something went wrong</div>
      <h1>We couldn’t finish that action.</h1>
      <p className="lede">
        Your data is still safe. Try the page again or return to the previous screen.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
