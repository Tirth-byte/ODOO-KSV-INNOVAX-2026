'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { fetchCollection } from '@/lib/firestore';
import { toDate, formatDate, initials } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { useAuth } from '@/hooks/useAuth';
import type { Quotation, RFQ, Vendor } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

export default function QuotationsPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [rfqFilter, setRfqFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [q, r, v] = await Promise.all([
          fetchCollection<Quotation>('quotations'),
          fetchCollection<RFQ>('rfqs'),
          fetchCollection<Vendor>('vendors'),
        ]);
        setQuotations(q);
        setRfqs(r);
        setVendors(v);
      } catch {
        toast.error('Failed to load quotations.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rfqTitle = (rfqId: string) => rfqs.find((r) => r.id === rfqId)?.title ?? '—';
  const vendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.companyName ?? '—';

  const filtered = useMemo(() => {
    let list = quotations;
    // Vendors only see their own quotations
    if (role === 'vendor' && user) list = list.filter((q) => q.vendorId === user.id);
    if (statusFilter) list = list.filter((q) => q.status === statusFilter);
    if (rfqFilter) list = list.filter((q) => q.rfqId === rfqFilter);
    return [...list].sort((a, b) => (toDate(b.submittedAt)?.getTime() ?? 0) - (toDate(a.submittedAt)?.getTime() ?? 0));
  }, [quotations, statusFilter, rfqFilter, role, user]);

  return (
    <div className="page-enter">
      <PageHeader title="Quotations" subtitle="Vendor bids against your RFQs." />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select className="sm:w-52" value={rfqFilter} onChange={(e) => setRfqFilter(e.target.value)}>
            <option value="">All RFQs</option>
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </Select>
          <Select className="sm:w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No quotations found" description="Quotations submitted by vendors will appear here." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>RFQ</TH>
                <TH>Vendor</TH>
                <TH>Amount</TH>
                <TH>Delivery</TH>
                <TH>Status</TH>
                <TH>Submitted</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((q) => (
                <TR key={q.id} onClick={() => router.push(`/quotations/${q.id}`)}>
                  <TD className="font-medium">{rfqTitle(q.rfqId)}</TD>
                  <TD>{vendorName(q.vendorId)}</TD>
                  <TD>{formatCurrency(q.totalAmount)}</TD>
                  <TD>{q.deliveryDays} days</TD>
                  <TD><StatusBadge status={q.status} /></TD>
                  <TD className="text-text-secondary">{formatDate(q.submittedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
