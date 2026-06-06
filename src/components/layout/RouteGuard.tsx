'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const needsProfileCompletion = useAuthStore((s) => s.needsProfileCompletion);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (needsProfileCompletion) {
      router.replace('/complete-profile');
    } else if (!user) {
      router.replace('/login');
    }
  }, [loading, user, needsProfileCompletion, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
