'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, AlertTriangle } from 'lucide-react';
import { fetchCollection } from '@/lib/firestore';
import { toDate, formatDate, cn } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import type { Invoice, Vendor, PurchaseOrder } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [i, v, p] = await Promise.all([
          fetchCollection<Invoice>('invoices'),
          fetchCollection<Vendor>('vendors'),
          fetchCollection<PurchaseOrder>('purchaseOrders'),
        ]);
        setInvoices(i);
        setVendors(v);
        setPos(p);
      } catch {
        toast.error('Failed to load invoices.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.companyName ?? '—';
  const poNumber = (id: string) => pos.find((p) => p.id === id)?.poNumber ?? '—';

  const filtered = useMemo(() => {
    const list = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices;
    return [...list].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  }, [invoices, statusFilter]);

  // Aging Report Calculation (outstanding/unpaid invoices grouped by age days since creation)
  const agingReport = useMemo(() => {
    let band1 = 0; // 0-30 days
    let band2 = 0; // 31-60 days
    let band3 = 0; // 60+ days
    
    const now = new Date().getTime();
    invoices.forEach((inv) => {
      if (inv.status === 'paid') return;
      const createdDate = toDate(inv.createdAt) ?? new Date();
      const ageMs = now - createdDate.getTime();
      const ageDays = ageMs / (1000 * 3600 * 24);
      
      if (ageDays <= 30) {
        band1 += inv.grandTotal;
      } else if (ageDays <= 60) {
        band2 += inv.grandTotal;
      } else {
        band3 += inv.grandTotal;
      }
    });

    return { band1, band2, band3 };
  }, [invoices]);

  const isRowOverdue = (inv: Invoice) => {
    return inv.status !== 'paid' && inv.dueDate && new Date() > new Date(
      typeof inv.dueDate === 'string' 
        ? inv.dueDate 
        : (inv.dueDate as any).toDate?.() || inv.dueDate
    );
  };

  return (
    <div className="page-enter">
      <PageHeader title="Invoices" subtitle="Billing documents generated from purchase orders." />

      {/* Invoice Aging Report Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-4 border border-brand-border bg-white shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">0-30 Days (Current)</p>
            <p className="text-2xl font-black text-primary mt-1.5">{formatCurrency(agingReport.band1)}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-2 border-t border-brand-border/40 pt-1.5">Outstanding invoices under 30 days</p>
        </Card>
        
        <Card className="p-4 border border-brand-border bg-white shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">31-60 Days (Late)</p>
            <p className="text-2xl font-black text-amber-600 mt-1.5">{formatCurrency(agingReport.band2)}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-2 border-t border-brand-border/40 pt-1.5">Outstanding invoices 31 to 60 days</p>
        </Card>

        <Card className="p-4 border border-red-200 bg-red-50/5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">60+ Days (Critical)</p>
            <p className="text-2xl font-black text-red-600 mt-1.5">{formatCurrency(agingReport.band3)}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-2 border-t border-brand-border/40 pt-1.5">Outstanding invoices past 60 days</p>
        </Card>
      </div>

      <Card className="mb-5 p-4">
        <Select className="sm:w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </Select>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices" description="Generate an invoice from a purchase order to get started." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Invoice #</TH>
                <TH>PO #</TH>
                <TH>Vendor</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Due</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((inv) => {
                const overdue = isRowOverdue(inv);
                return (
                  <TR 
                    key={inv.id} 
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className={cn(
                      "cursor-pointer hover:bg-orange-50/20 transition",
                      overdue && "bg-red-50/30 hover:bg-red-50/50"
                    )}
                  >
                    <TD className="font-semibold text-primary">{inv.invoiceNumber}</TD>
                    <TD className="font-medium">{poNumber(inv.poId)}</TD>
                    <TD>{vendorName(inv.vendorId)}</TD>
                    <TD className="font-semibold text-text-primary">{formatCurrency(inv.grandTotal)}</TD>

                    <TD>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={inv.status} />
                        {overdue && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 uppercase tracking-wider border border-red-200">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD className={cn("text-text-secondary text-sm", overdue && "text-red-600 font-bold")}>
                      {formatDate(inv.dueDate)}
                    </TD>
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
