'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut, ChevronDown, Search, Settings } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from '@/components/ui/Toast';
import { initials } from '@/lib/utils';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { LogoIcon } from '@/components/ui/Logo';

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const toggleCommand = useUIStore((s) => s.toggleCommand);

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-100 bg-white shadow-sm px-4 lg:px-8">
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <LogoIcon size={28} />
          <span className="text-sm font-bold tracking-tight text-gray-900">VendorBridge</span>
        </div>
      </div>

      {/* Global search trigger (Cmd+K) */}
      <button
        onClick={toggleCommand}
        className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-400 transition hover:border-orange-200 hover:bg-orange-50 hover:text-gray-600 lg:flex lg:w-80"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search everything…</span>
        <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* Mobile search */}
        <button
          onClick={toggleCommand}
          aria-label="Search"
          className="rounded-full p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 lg:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        <NotificationsBell />

        {/* User profile menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-orange-50"
          >
            <div className="vb-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">
              {initials(user?.fullName ?? 'User') || '?'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-gray-900">{user?.fullName ?? 'User'}</p>
              <p className="text-[11px] text-gray-400">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-gray-900">{user?.fullName}</p>
                  <p className="truncate text-xs text-gray-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-text-primary hover:bg-orange-50"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
