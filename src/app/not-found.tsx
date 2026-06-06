'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoFull } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-orange-50/50 via-white to-orange-100/30 px-6 text-center">
      
      <div className="rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
        <LogoFull iconSize={40} wordSize="md" />
      </div>

      <div className="space-y-2">
        <h1 className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">404</h1>
        <h2 className="text-2xl font-black text-text-primary">Destination Not Found</h2>
        <p className="max-w-md text-sm text-text-secondary leading-relaxed">
          The page you are trying to access doesn&apos;t exist, has been removed, or you don&apos;t have authorization to view it.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Link href="/dashboard">
          <Button className="w-full">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Dashboard
          </Button>
        </Link>
      </div>
      
    </div>
  );
}
