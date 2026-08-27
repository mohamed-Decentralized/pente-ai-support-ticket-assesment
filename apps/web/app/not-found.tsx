import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <section className="pageShell narrow">
      <div className="eyebrow">Page not found</div>
      <h1>There’s nothing here.</h1>
      <p className="lede">The page may have moved, or the ticket link may be incorrect.</p>
      <Link className="button primary" href="/">
        Return home
      </Link>
    </section>
  );
}
