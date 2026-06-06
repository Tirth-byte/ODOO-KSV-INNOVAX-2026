'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { fetchCollection } from '@/lib/firestore';
import { toDate, formatDate } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import type { PurchaseOrder, Vendor } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [p, v] = await Promise.all([
          fetchCollection<PurchaseOrder>('purchaseOrders'),
          fetchCollection<Vendor>('vendors'),
        ]);
        setPos(p);
        setVendors(v);
      } catch {
        toast.error('Failed to load purchase orders.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.companyName ?? '—';

  const filtered = useMemo(() => {
    let list = pos;
    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (vendorFilter) {
      list = list.filter((p) => p.vendorId === vendorFilter);
    }
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((p) => {
        const d = toDate(p.poDate ?? p.createdAt);
        return d && d.getTime() >= start.getTime();
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((p) => {
        const d = toDate(p.poDate ?? p.createdAt);
        return d && d.getTime() <= end.getTime();
      });
    }
    return [...list].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  }, [pos, statusFilter, vendorFilter, startDate, endDate]);

  const totalSum = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + (curr.grandTotal ?? 0), 0);
  }, [filtered]);

  return (
    <div className="page-enter">
      <PageHeader title="Purchase Orders" subtitle="Confirmed orders generated from approved quotations." />

      <Card className="mb-5 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Status</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Vendor</label>
          <Select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.companyName}</option>
            ))}
          </Select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">From Date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">To Date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        
        {(statusFilter || vendorFilter || startDate || endDate) && (
          <Button variant="secondary" onClick={() => {
            setStatusFilter('');
            setVendorFilter('');
            setStartDate('');
            setEndDate('');
          }}>
            Reset
          </Button>
        )}
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No purchase orders" description="Approve a quotation to automatically generate a purchase order." />
        ) : (
          <div>
            <Table>
              <THead>
                <TR>
                  <TH>PO Number</TH>
                  <TH>Vendor</TH>
                  <TH>Grand Total</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((po) => (
                  <TR key={po.id} onClick={() => router.push(`/purchase-orders/${po.id}`)} className="cursor-pointer hover:bg-orange-50/20">
                    <TD className="font-semibold text-primary">{po.poNumber}</TD>
                    <TD className="font-medium">{vendorName(po.vendorId)}</TD>
                    <TD className="font-semibold text-text-primary">{formatCurrency(po.grandTotal)}</TD>
                    <TD><StatusBadge status={po.status} /></TD>
                    <TD className="text-text-secondary">{formatDate(po.poDate ?? po.createdAt)}</TD>
                  </TR>
                ))}
                {/* Total PO Value Summary Row */}
                <TR className="bg-orange-50/20 font-bold hover:bg-orange-50/20 border-t border-brand-border">
                  <TD className="text-text-secondary font-bold text-right py-4" colSpan={2}>Total Order Value:</TD>
                  <TD className="text-primary text-base font-extrabold py-4">{formatCurrency(totalSum)}</TD>
                  <TD colSpan={2}></TD>
                </TR>
              </TBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
