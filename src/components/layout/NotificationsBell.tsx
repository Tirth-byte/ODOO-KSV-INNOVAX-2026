'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { Bell, CheckCircle2, XCircle, PlusCircle, Send, Activity as ActivityIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { relativeTime, toDate, cn } from '@/lib/utils';
import type { ActivityLog, EntityType } from '@/lib/types';

const ENTITY_PATH: Record<EntityType, string> = {
  RFQ: '/rfqs',
  Vendor: '/vendors',
  PO: '/purchase-orders',
  Invoice: '/invoices',
  Approval: '/approvals',
  Quotation: '/quotations',
};

function iconFor(action: string): { Icon: LucideIcon; color: string } {
  const a = action.toLowerCase();
  if (a.includes('approv')) return { Icon: CheckCircle2, color: 'text-success' };
  if (a.includes('reject')) return { Icon: XCircle, color: 'text-danger' };
  if (a.includes('paid')) return { Icon: CheckCircle2, color: 'text-success' };
  if (a.includes('sent') || a.includes('notif')) return { Icon: Send, color: 'text-blue-600' };
  if (a.includes('creat') || a.includes('generat') || a.includes('submit')) return { Icon: PlusCircle, color: 'text-blue-600' };
  return { Icon: ActivityIcon, color: 'text-primary' };
}

const SEEN_KEY = 'vb_notifications_seen';

export function NotificationsBell() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SEEN_KEY) : null;
    setLastSeen(stored ? Number(stored) : 0);

    const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) })));
      },
      () => {
        /* permission or offline — leave empty */
      },
    );
    return () => unsub();
  }, []);

  const unread = useMemo(
    () => logs.filter((l) => (toDate(l.createdAt)?.getTime() ?? 0) > lastSeen).length,
    [logs, lastSeen],
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setLastSeen(now);
      window.localStorage.setItem(SEEN_KEY, String(now));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-brand-border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Notifications</p>
              <button onClick={() => router.push('/activity')} className="text-xs font-medium text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-secondary">No notifications yet.</p>
              ) : (
                logs.map((log) => {
                  const { Icon, color } = iconFor(log.action);
                  return (
                    <button
                      key={log.id}
                      onClick={() => {
                        setOpen(false);
                        router.push(ENTITY_PATH[log.entityType] ?? '/activity');
                      }}
                      className="flex w-full items-start gap-3 border-b border-brand-border/60 px-4 py-3 text-left transition hover:bg-orange-50/50"
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', color)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-text-primary">{log.description}</span>
                        <span className="block text-xs text-text-secondary">{relativeTime(log.createdAt)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
