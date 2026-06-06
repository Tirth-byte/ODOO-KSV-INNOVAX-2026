'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, LayoutGrid, List, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, toDate, daysUntil, cn } from '@/lib/utils';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { RFQ } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

const COLUMNS = [
  { id: 'draft', label: 'Draft' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function RFQsPage() {
  const router = useRouter();
  const { role } = useAuth();
  const editable = can(role, 'manageRfqs');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'rfqs'),
      (snap) => {
        setRfqs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQ)));
        setLoading(false);
      },
      () => {
        toast.error('Failed to load RFQs.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const list = statusFilter ? rfqs.filter((r) => r.status === statusFilter) : rfqs;
    return [...list].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  }, [rfqs, statusFilter]);

  function renderDeadlineCountdown(deadline: any) {
    const days = daysUntil(deadline);
    if (days === null) return null;
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-xs font-semibold">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-xs font-semibold">
          <Clock className="h-3 w-3" /> Closes Today
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-xs font-semibold">
          <Clock className="h-3 w-3" /> {days} days left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-600 px-2 py-0.5 text-xs font-medium">
        <Calendar className="h-3 w-3 text-gray-400" /> {days} days left
      </span>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Requests for Quotation"
        subtitle="Create and track sourcing requests."
        action={
          editable && (
            <Link href="/rfqs/new">
              <Button>
                <Plus className="h-4 w-4" /> New RFQ
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Select className="sm:w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 self-end sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition ${viewMode === 'kanban' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              title="Kanban Board"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><TableSkeleton /></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No RFQs yet"
            description="Create a request for quotation and invite vendors to bid."
            action={editable ? <Link href="/rfqs/new"><Button><Plus className="h-4 w-4" /> New RFQ</Button></Link> : undefined}
          />
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Created</TH>
                <TH>Deadline</TH>
                <TH>Countdown</TH>
                <TH>Vendors</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => (
                <TR key={r.id} onClick={() => router.push(`/rfqs/${r.id}`)} className="cursor-pointer hover:bg-orange-50/20">
                  <TD className="font-semibold text-text-primary">{r.title}</TD>
                  <TD className="text-text-secondary text-sm">{formatDate(r.createdAt)}</TD>
                  <TD className="text-text-secondary text-sm">{formatDate(r.deadline)}</TD>
                  <TD>{renderDeadlineCountdown(r.deadline)}</TD>
                  <TD className="font-medium">{r.invitedVendorIds?.length ?? 0}</TD>
                  <TD><StatusBadge status={r.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const columnRfqs = filtered.filter((r) => r.status === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-3 bg-gray-50/50 rounded-xl p-3 border border-gray-100 min-h-[500px]">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      col.id === 'open' ? 'bg-blue-500 shadow-sm' : 
                      col.id === 'closed' ? 'bg-gray-400' : 
                      col.id === 'cancelled' ? 'bg-red-500' : 'bg-gray-300'
                    )} />
                    <h3 className="font-bold text-sm text-text-primary capitalize">{col.label}</h3>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary bg-white px-2 py-0.5 rounded-full border border-brand-border">{columnRfqs.length}</span>
                </div>
                
                <div className="flex-1 space-y-3">
                  {columnRfqs.length === 0 ? (
                    <div className="flex items-center justify-center border border-dashed border-gray-200 rounded-xl py-10 bg-white/40">
                      <p className="text-xs text-gray-400">Empty</p>
                    </div>
                  ) : (
                    columnRfqs.map((r) => (
                      <Card 
                        key={r.id} 
                        onClick={() => router.push(`/rfqs/${r.id}`)}
                        className="p-4 cursor-pointer hover:shadow-md hover:border-orange-300 transition duration-200 border border-brand-border bg-white flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-text-primary truncate">{r.title}</h4>
                          <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">{r.description}</p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-brand-border flex justify-between items-center text-[10px] text-text-secondary">
                          <span>{formatDate(r.createdAt)}</span>
                          <span className="font-medium">{r.invitedVendorIds?.length ?? 0} invited</span>
                        </div>

                        <div className="mt-3 flex justify-end">
                          {renderDeadlineCountdown(r.deadline)}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
