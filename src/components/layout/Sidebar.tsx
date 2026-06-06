'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { HelpCircle, Settings } from 'lucide-react';
import { db } from '@/lib/firebase';
import { NAV_ITEMS } from '@/lib/nav';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

import { LogoFull } from '@/components/ui/Logo';

const APP_VERSION = 'v1.0.0';

function BrandMark() {
  return <LogoFull iconSize={38} wordSize="md" />;
}

/** Live count of pending approvals for the sidebar badge. */
function usePendingApprovals(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'approvals'), where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => setCount(snap.size),
      () => setCount(0),
    );
    return () => unsub();
  }, [enabled]);
  return count;
}

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const setHelpOpen = useUIStore((s) => s.setHelpOpen);
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.feature));
  const pendingApprovals = usePendingApprovals(canAccess(role, 'approvals'));

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-gray-100 bg-white shadow-sm lg:flex">
      <div className="border-b border-gray-100 px-4 py-4">
        <BrandMark />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const badge = item.feature === 'approvals' && pendingApprovals > 0 ? pendingApprovals : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'border-l-2 border-orange-500 rounded-l-none rounded-r-none bg-orange-50 text-orange-600'
                  : 'rounded-xl border-l-2 border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className={cn('h-5 w-5 transition-colors', active ? 'text-orange-500' : 'text-gray-400')} />
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-gray-100 p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
            pathname.startsWith('/settings')
              ? 'bg-orange-50 text-orange-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          )}
        >
          <Settings className="h-5 w-5 text-gray-400" /> Settings
        </Link>
        <button
          onClick={() => setHelpOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900"
        >
          <HelpCircle className="h-5 w-5 text-gray-400" /> Help & shortcuts
        </button>
        <p className="px-3 pt-2 text-[11px] text-gray-400">
          {APP_VERSION} · © 2026 VendorBridge
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.feature)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 z-30 flex w-full justify-around border-t border-brand-border bg-white py-2 lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all duration-150',
              active ? 'text-primary' : 'text-text-secondary',
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label.split(' ')[0]}
          </Link>
        );
      })}
    </nav>
  );
}
