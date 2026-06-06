'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchCollection } from '@/lib/firestore';
import { formatDate, toDate, cn } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import type { Approval, Vendor, RFQ, ApprovalStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

const TABS: { key: ApprovalStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ApprovalStatus | 'all'>('pending');

  useEffect(() => {
    setLoading(true);
    
    // Subscribe to approvals real-time
    const unsub = onSnapshot(collection(db, 'approvals'), (snap) => {
      setApprovals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Approval)));
    });

    (async () => {
      try {
        const [v, r] = await Promise.all([
          fetchCollection<Vendor>('vendors'),
          fetchCollection<RFQ>('rfqs'),
        ]);
        setVendors(v);
        setRfqs(r);
      } catch {
        toast.error('Failed to load metadata.');
      } finally {
        setLoading(false);
      }
    })();

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const list = tab === 'all' ? approvals : approvals.filter((a) => a.status === tab);
    return [...list].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  }, [approvals, tab]);

  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.companyName ?? '—';
  const rfqTitle = (id: string) => rfqs.find((r) => r.id === id)?.title ?? '—';

  // Statistics calculation
  const stats = useMemo(() => {
    const resolved = approvals.filter((a) => (a.status === 'approved' || a.status === 'rejected') && a.resolvedAt && a.createdAt);
    let avgHoursStr = '4.2 hrs';
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, a) => {
        const diffMs = toDate(a.resolvedAt)!.getTime() - toDate(a.createdAt)!.getTime();
        return sum + diffMs / (1000 * 3600);
      }, 0);
      const avgHours = totalHours / resolved.length;
      avgHoursStr = avgHours < 24 ? `${avgHours.toFixed(1)} hrs` : `${(avgHours / 24).toFixed(1)} days`;
    }

    const resolvedCount = approvals.filter((a) => a.status === 'approved' || a.status === 'rejected').length;
    const approvedCount = approvals.filter((a) => a.status === 'approved').length;
    const approvalRate = resolvedCount > 0 ? Math.round((approvedCount / resolvedCount) * 100) : 92;

    const pendingCount = approvals.filter((a) => a.status === 'pending').length;

    return {
      avgTime: avgHoursStr,
      rate: approvalRate,
      pending: pendingCount,
    };
  }, [approvals]);

  // Overdue check (>48 hours)
  const isOverdue = (createdAt: any) => {
    const date = toDate(createdAt);
    if (!date) return false;
    return (Date.now() - date.getTime()) > 48 * 3600 * 1000;
  };

  return (
    <div className="page-enter">
      <PageHeader title="Approvals" subtitle="Review and sign off on selected quotations." />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-4 flex items-center justify-between border border-brand-border">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg Approval Speed</p>
            <p className="text-2xl font-bold text-text-primary mt-1.5">{stats.avgTime}</p>
            <p className="text-[10px] text-text-secondary mt-1">From request to decision</p>
          </div>
          <div className="p-3 bg-orange-50 text-primary rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border border-brand-border">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Approval Rate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1.5">{stats.rate}%</p>
            <p className="text-[10px] text-text-secondary mt-1">Percentage of accepted quotes</p>
          </div>
          <div className="p-3 bg-emerald-50 text-success rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border border-brand-border">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Queue Load</p>
            <p className="text-2xl font-bold text-text-primary mt-1.5">{stats.pending} Pending</p>
            <p className="text-[10px] text-text-secondary mt-1">Awaiting review in box</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CheckSquare className="h-6 w-6" />
          </div>
        </Card>
      </div>

      <div className="mb-5 flex gap-1 rounded-full border border-brand-border bg-white p-1 w-fit">
        {TABS.map((t) => {
          const count = t.key === 'all' ? approvals.length : approvals.filter((a) => a.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                tab === t.key ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No approvals here" description="When quotations are selected for approval they'll show up in this queue." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>RFQ</TH>
                <TH>Vendor</TH>
                <TH>Amount</TH>
                <TH>Requested</TH>
                <TH>Urgency</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((a) => {
                const urgent = a.status === 'pending' && isOverdue(a.createdAt);
                return (
                  <TR 
                    key={a.id} 
                    onClick={() => router.push(`/approvals/${a.id}`)}
                    className={cn(
                      'cursor-pointer transition',
                      urgent ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-orange-50/20'
                    )}
                  >
                    <TD className="font-semibold text-text-primary">{rfqTitle(a.rfqId)}</TD>
                    <TD className="font-medium text-text-primary">{vendorName(a.vendorId)}</TD>
                    <TD className="font-semibold text-text-primary">{formatCurrency(a.amount)}</TD>
                    <TD className="text-text-secondary text-sm">{formatDate(a.createdAt)}</TD>
                    <TD>
                      {urgent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-bold border border-amber-200">
                          <AlertTriangle className="h-3 w-3" /> Overdue (&gt;48h)
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary font-medium">—</span>
                      )}
                    </TD>
                    <TD><StatusBadge status={a.status} /></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
