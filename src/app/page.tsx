'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const { user, loading } = useAuth();
  const needsProfileCompletion = useAuthStore((s) => s.needsProfileCompletion);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (needsProfileCompletion) {
      router.replace('/complete-profile');
    } else if (user) {
      router.replace(user.role === 'vendor' ? '/quotations' : '/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, needsProfileCompletion, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background page-enter">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
