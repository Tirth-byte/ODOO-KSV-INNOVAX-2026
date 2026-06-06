'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { signInWithGoogle } from '@/lib/googleAuth';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function GoogleButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const destination = await signInWithGoogle();
      if (destination === 'quotations') {
        router.replace('/quotations');
      } else if (destination === 'dashboard') {
        router.replace('/dashboard');
      } else {
        router.replace('/complete-profile');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — fail silently.
      } else if (code === 'auth/account-exists-with-different-credential') {
        toast.error('An account with this email already exists. Please sign in with email/password.');
      } else if (code === 'auth/network-request-failed') {
        toast.error('Connection failed. Please try again.');
      } else {
        toast.error('Connection failed. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex w-full items-center justify-center gap-3 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-text-secondary" /> : <GoogleLogo />}
      Continue with Google
    </button>
  );
}
