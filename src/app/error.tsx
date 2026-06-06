'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoFull } from '@/components/ui/Logo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to the user below; digest is available for server log correlation.
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="mb-4">
        <LogoFull iconSize={40} wordSize="md" />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-danger mx-auto">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        An unexpected error occurred. You can try again or return to the dashboard.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
