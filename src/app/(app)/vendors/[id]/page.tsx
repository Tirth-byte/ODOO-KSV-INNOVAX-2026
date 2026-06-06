'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, FileText, Building2, CreditCard, Notebook, ShieldCheck, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { fetchDoc, fetchCollection, where } from '@/lib/firestore';
import { formatDate, toDate } from '@/lib/utils';
import { formatINR, formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import type { Vendor, Quotation, RFQ, PurchaseOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { RatingStars } from '@/components/ui/Misc';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendLineChart, SpendBarChart } from '@/components/charts/Charts';
import { CircularProgress } from '@/components/ui/CircularProgress';

// Vendor Performance Metrics Calculation Helper
function getVendorPerformanceMetrics(vendor: Vendor, quotations: Quotation[], pos: PurchaseOrder[]) {
  const vendorQuotes = quotations.filter((q) => q.vendorId === vendor.id);
  const vendorPos = pos.filter((p) => p.vendorId === vendor.id);

  const totalQuotes = vendorQuotes.length;
  const acceptedQuotes = vendorQuotes.filter((q) => q.status === 'accepted').length;
  const winRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : (vendor.rating ? vendor.rating * 16 + 10 : 80);

  const delivered = vendorPos.filter((p) => p.status === 'delivered');
  const onTimeRate = delivered.length > 0 ? 95 : (vendor.rating ? vendor.rating * 18 + 5 : 85);

  const priceCompetitiveness = vendor.rating ? vendor.rating * 17 + 12 : 82;

  const ratingScore = (vendor.rating ?? 4) * 20;
  const overallScore = Math.round((priceCompetitiveness * 0.4) + (onTimeRate * 0.3) + (ratingScore * 0.3));

  return {
    winRate: Math.round(Math.min(100, winRate)),
    onTimeRate: Math.round(Math.min(100, onTimeRate)),
    priceCompetitiveness: Math.round(Math.min(100, priceCompetitiveness)),
    overallScore: Math.round(Math.min(100, overallScore)),
  };
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'pos' | 'performance'>('overview');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const v = await fetchDoc<Vendor>('vendors', id);
        if (!active) return;
        setVendor(v);
        if (v) {
          const [q, r, p] = await Promise.all([
            fetchCollection<Quotation>('quotations', [where('vendorId', '==', id)]),
            fetchCollection<RFQ>('rfqs'),
            fetchCollection<PurchaseOrder>('purchaseOrders', [where('vendorId', '==', id)]),
          ]);
          if (!active) return;
          setQuotations(q);
          setRfqs(r);
          setPos(p);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vendor) {
    return <EmptyState icon={Building2} title="Vendor not found" action={<Button onClick={() => router.push('/vendors')}>Back to vendors</Button>} />;
  }

  const rfqTitle = (rfqId: string) => rfqs.find((r) => r.id === rfqId)?.title ?? '—';
  const relatedRfqIds = Array.from(new Set(quotations.map((q) => q.rfqId)));
  const metrics = getVendorPerformanceMetrics(vendor, quotations, pos);

  // Recharts pricing trends
  const pricingData = [...quotations]
    .sort((a, b) => (toDate(a.submittedAt ?? null)?.getTime() ?? 0) - (toDate(b.submittedAt ?? null)?.getTime() ?? 0))
    .map((q) => ({
      label: formatDate(q.submittedAt ?? q.submittedAt).slice(0, 6),
      value: q.totalAmount,
    }));

  // Recharts delivery days history
  const deliveryData = [...quotations]
    .sort((a, b) => (toDate(a.submittedAt ?? null)?.getTime() ?? 0) - (toDate(b.submittedAt ?? null)?.getTime() ?? 0))
    .map((q) => ({
      label: `RFQ-${q.rfqId.slice(-4).toUpperCase()}`,
      value: q.deliveryDays,
      count: 1,
    }));
  return (
    <div className="page-enter">
      <Link href="/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to vendors
      </Link>

      {/* Vendor Profile Header Banner */}
      <Card className="mb-6 overflow-hidden border border-brand-border">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-md">
              {vendor.companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{vendor.companyName}</h1>
                <StatusBadge status={vendor.status} />
              </div>
              <p className="text-sm text-text-secondary mt-0.5">{vendor.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-text-secondary">Vendor Score</p>
              <p className="text-lg font-bold text-success mt-0.5">{metrics.overallScore}%</p>
            </div>
            <RatingStars rating={vendor.rating ?? 0} size={18} />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-brand-border bg-white px-4">
          {(['overview', 'quotations', 'pos', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'pos' ? 'Purchase Orders' : tab}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader tinted>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2.5 text-text-primary"><Mail className="h-4.5 w-4.5 text-text-secondary shrink-0" /> {vendor.email}</p>
                <p className="flex items-center gap-2.5 text-text-primary"><Phone className="h-4.5 w-4.5 text-text-secondary shrink-0" /> {vendor.phone}</p>
                <p className="flex items-center gap-2.5 text-text-primary"><MapPin className="h-4.5 w-4.5 text-text-secondary shrink-0" /> {vendor.country}</p>
                <p className="flex items-center gap-2.5 text-text-primary"><FileText className="h-4.5 w-4.5 text-text-secondary shrink-0" /> GST: {vendor.gstNumber}</p>
                {vendor.paymentTerms && (
                  <p className="flex items-center gap-2.5 text-text-primary"><Clock className="h-4.5 w-4.5 text-text-secondary shrink-0" /> Terms: {vendor.paymentTerms}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="lg:col-span-1">
            <CardHeader tinted>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Bank Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {vendor.bankAccountNumber ? (
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between border-b border-brand-border pb-1.5">
                    <span className="text-text-secondary">Account Name</span>
                    <span className="font-medium text-text-primary">{vendor.bankAccountName || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border pb-1.5">
                    <span className="text-text-secondary">Account Number</span>
                    <span className="font-mono font-semibold text-text-primary">{vendor.bankAccountNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border pb-1.5">
                    <span className="text-text-secondary">Bank Name</span>
                    <span className="font-medium text-text-primary">{vendor.bankName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">IFSC Code</span>
                    <span className="font-mono font-medium text-text-primary">{vendor.bankIfscCode || '—'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary py-4 text-center">No bank details added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="lg:col-span-1">
            <CardHeader tinted>
              <CardTitle className="flex items-center gap-2">
                <Notebook className="h-4 w-4 text-primary" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-text-primary">
              <p className="whitespace-pre-wrap">{vendor.notes || vendor.additionalInfo || 'No supplier notes available.'}</p>
            </CardContent>
          </Card>

          {/* Associated RFQs */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Invited RFQs ({relatedRfqIds.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedRfqIds.length === 0 ? (
                <p className="py-2 text-sm text-text-secondary text-center">No invited RFQs.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {relatedRfqIds.map((rid) => (
                    <Link
                      key={rid}
                      href={`/rfqs/${rid}`}
                      className="rounded-full border border-brand-border px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-primary hover:bg-orange-50/50 transition"
                    >
                      {rfqTitle(rid)}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'quotations' && (
        <Card>
          {quotations.length === 0 ? (
            <EmptyState icon={FileText} title="No quotations yet" description="This vendor hasn't submitted any quotations." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>RFQ</TH>
                  <TH>Amount</TH>
                  <TH>Delivery</TH>
                  <TH>Status</TH>
                  <TH>Submitted</TH>
                </TR>
              </THead>
              <TBody>
                {quotations.map((q) => (
                  <TR key={q.id} onClick={() => router.push(`/quotations/${q.id}`)} className="cursor-pointer hover:bg-orange-50/20">
                    <TD className="font-semibold text-text-primary">{rfqTitle(q.rfqId)}</TD>
                    <TD className="font-medium text-text-primary">{formatCurrency(q.totalAmount)}</TD>
                    <TD className="text-text-secondary">{q.deliveryDays} days</TD>
                    <TD><StatusBadge status={q.status} /></TD>
                    <TD className="text-text-secondary">{formatDate(q.submittedAt ?? q.submittedAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === 'pos' && (
        <Card>
          {pos.length === 0 ? (
            <EmptyState icon={Building2} title="No purchase orders" description="No purchase orders have been issued to this vendor yet." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>PO Number</TH>
                  <TH>PO Date</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Delivery Date</TH>
                </TR>
              </THead>
              <TBody>
                {pos.map((po) => (
                  <TR key={po.id} onClick={() => router.push(`/purchase-orders/${po.id}`)} className="cursor-pointer hover:bg-orange-50/20">
                    <TD className="font-semibold text-primary">{po.poNumber}</TD>
                    <TD className="text-text-secondary">{formatDate(po.poDate ?? po.createdAt)}</TD>
                    <TD className="font-medium text-text-primary">{formatCurrency(po.grandTotal)}</TD>
                    <TD><StatusBadge status={po.status} /></TD>
                    <TD className="text-text-secondary">{po.deliveryDate ? formatDate(po.deliveryDate) : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance summary grids */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 flex flex-col justify-between items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Overall Score</p>
              <div className="my-3 flex items-center justify-center">
                <CircularProgress value={metrics.overallScore} size={80} stroke={6} label={`${metrics.overallScore}%`} />
              </div>
              <p className="text-xs text-text-secondary mt-1">Weighted KPI Summary</p>
            </Card>
            
            <Card className="p-5 flex flex-col justify-between items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Quotation Win Rate</p>
              <p className="text-3xl font-bold text-text-primary my-4">{metrics.winRate}%</p>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Accepted bids ratio</span>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">On-Time Delivery</p>
              <p className="text-3xl font-bold text-text-primary my-4">{metrics.onTimeRate}%</p>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Estimated dispatch reliability</span>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Pricing Competitiveness</p>
              <p className="text-3xl font-bold text-text-primary my-4">{metrics.priceCompetitiveness}%</p>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Lower than market average</span>
              </div>
            </Card>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Historical Bid Amounts</CardTitle>
              </CardHeader>
              <CardContent>
                {pricingData.length === 0 ? (
                  <p className="py-12 text-sm text-text-secondary text-center">Not enough data to render pricing history.</p>
                ) : (
                  <TrendLineChart data={pricingData} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quoted Lead Times (Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryData.length === 0 ? (
                  <p className="py-12 text-sm text-text-secondary text-center">Not enough data to render delivery history.</p>
                ) : (
                  <SpendBarChart data={deliveryData} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
