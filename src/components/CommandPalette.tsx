'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CornerDownLeft,
  Building2,
  FileSearch,
  ShoppingCart,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchCollection } from '@/lib/firestore';
import { NAV_ITEMS } from '@/lib/nav';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { Vendor, RFQ, PurchaseOrder, Invoice } from '@/lib/types';

interface Item {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { role } = useAuth();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggleCommand = useUIStore((s) => s.toggleCommand);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCommand, setOpen]);

  // Lazy-load entities the first time the palette opens.
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const [vendors, rfqs, pos, invoices] = await Promise.all([
          fetchCollection<Vendor>('vendors'),
          fetchCollection<RFQ>('rfqs'),
          fetchCollection<PurchaseOrder>('purchaseOrders'),
          fetchCollection<Invoice>('invoices'),
        ]);
        const built: Item[] = [
          ...vendors.map((v) => ({ id: v.id, label: v.companyName, sub: v.category, href: `/vendors/${v.id}`, icon: Building2, group: 'Vendors' })),
          ...rfqs.map((r) => ({ id: r.id, label: r.title, sub: `RFQ · ${r.status}`, href: `/rfqs/${r.id}`, icon: FileSearch, group: 'RFQs' })),
          ...pos.map((p) => ({ id: p.id, label: p.poNumber, sub: `PO · ${p.status}`, href: `/purchase-orders/${p.id}`, icon: ShoppingCart, group: 'Purchase Orders' })),
          ...invoices.map((i) => ({ id: i.id, label: i.invoiceNumber, sub: `Invoice · ${i.status}`, href: `/invoices/${i.id}`, icon: Receipt, group: 'Invoices' })),
        ];
        setItems(built);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const navItems: Item[] = useMemo(
    () =>
      NAV_ITEMS.filter((n) => canAccess(role, n.feature)).map((n) => ({
        id: `nav-${n.href}`,
        label: n.label,
        sub: 'Go to page',
        href: n.href,
        icon: n.icon,
        group: 'Navigation',
      })),
    [role],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [...navItems, ...items];
    const filtered = q
      ? pool.filter((i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
      : navItems;
    return filtered.slice(0, 24);
  }, [query, items, navItems]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="card relative z-10 w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-brand-border px-4">
          <Search className="h-4 w-4 shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search vendors, RFQs, POs, invoices…"
            className="h-12 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
          />
          <kbd className="rounded-md border border-brand-border px-1.5 py-0.5 text-[10px] text-text-secondary">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-secondary">No results for “{query}”.</p>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                    i === active ? 'bg-orange-50' : 'hover:bg-orange-50/60',
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{item.label}</span>
                    <span className="block truncate text-xs text-text-secondary">{item.sub}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-text-secondary">{item.group}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-text-secondary" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-brand-border px-4 py-2 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Navigate & search everything</span>
          <span>↑↓ to move · ↵ to open</span>
        </div>
      </div>
    </div>
  );
}
