'use client';

import { useAuthStore } from '@/store/auth';

/** Convenience accessor for the authenticated user + loading state. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  return { user, loading, role: user?.role };
}
