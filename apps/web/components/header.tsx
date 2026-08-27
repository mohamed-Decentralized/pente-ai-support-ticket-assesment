'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="siteHeader">
      <Link className="brand" href="/">
        <span className="brandMark">P</span>
        <span>Pente Support</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/tickets/create">Create ticket</Link>
        <Link href="/tickets/lookup">Find tickets</Link>
        {user && <Link href="/dashboard">Dashboard</Link>}
        {user?.role === 'Admin' && <Link href="/reports">Reports</Link>}
        {!user && (
          <Link className="navAction" href="/login">
            Staff sign in
          </Link>
        )}
        {user && (
          <button className="linkButton" onClick={() => void logout()}>
            Sign out
          </button>
        )}
      </nav>
    </header>
  );
}
