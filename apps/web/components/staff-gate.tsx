'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from './auth-provider';

export function StaffGate({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (adminOnly && user.role !== 'Admin'))) router.replace('/login');
  }, [adminOnly, loading, router, user]);

  if (loading) return <div className="statePanel">Restoring your secure session…</div>;
  if (!user || (adminOnly && user.role !== 'Admin'))
    return <div className="statePanel">Redirecting…</div>;
  return children;
}
