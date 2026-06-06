'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, GitCompare, Crown, Zap, HelpCircle, AlertCircle, Info } from 'lucide-react';
import { fetchDoc, fetchCollection, where } from '@/lib/firestore';
import { initiateApproval } from '@/lib/workflow';
import { toDate, cn } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { RFQ, Quotation, Vendor } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, RatingStars } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';

function CompareInner() {
  const params = useSearchParams();
  const router = useRouter();
  const rfqId = params.get('rfqId') ?? '';
  const { user, role } = useAuth();
  const canApprove = can(role, 'reviewQuotation') || can(role, 'approve');

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [acting, setActing] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!rfqId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [r, q, v] = await Promise.all([
          fetchDoc<RFQ>('rfqs', rfqId),
          fetchCollection<Quotation>('quotations', [where('rfqId', '==', rfqId)]),
          fetchCollection<Vendor>('vendors'),
        ]);
        setRfq(r);
        setQuotations(q.filter((x) => x.status !== 'draft'));
        setVendors(v);
        // Trigger load animation
        setTimeout(() => setAnimate(true), 150);
      } finally {
        setLoading(false);
      }
    })();
  }, [rfqId]);

  const vendor = (vid: string) => vendors.find((v) => v.id === vid);

  async function confirmSelect() {
    if (!selected || !user) return;
    setActing(true);
    try {
      await initiateApproval(selected, user);
      toast.success('Approval request created.');
      router.push('/approvals');
    } catch {
      toast.error('Could not initiate approval.');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!rfqId || !rfq) {
    return <EmptyState icon={GitCompare} title="Nothing to compare" description="Open an RFQ with received quotations to compare." action={<Link href="/rfqs"><Button>Browse RFQs</Button></Link>} />;
  }
  if (quotations.length === 0) {
    return (
      <div className="page-enter">
        <PageHeader title="Compare Quotations" subtitle={rfq.title} />
        <EmptyState icon={GitCompare} title="No quotations received yet" description="Vendors haven't submitted quotations for this RFQ." />
      </div>
    );
  }

  const lowestPrice = Math.min(...quotations.map((q) => q.totalAmount));
  const fastestDelivery = Math.min(...quotations.map((q) => q.deliveryDays));

  // Recommendation score: price 40% + delivery 30% + rating 30% = overall score
  const scoredQuotes = quotations.map((q) => {
    const v = vendor(q.vendorId);
    const vRating = v?.rating ?? 4.0;
    
    const priceScore = lowestPrice > 0 ? (lowestPrice / q.totalAmount) * 100 : 100;
    const deliveryScore = fastestDelivery > 0 ? (fastestDelivery / q.deliveryDays) * 100 : 100;
    const ratingScore = (vRating / 5) * 100;

    const overallScore = Math.round((priceScore * 0.4) + (deliveryScore * 0.3) + (ratingScore * 0.3));

    return {
      ...q,
      score: overallScore,
      priceScore: Math.round(priceScore),
      deliveryScore: Math.round(deliveryScore),
      ratingScore: Math.round(ratingScore),
    };
  });

  const highestScore = Math.max(...scoredQuotes.map((sq) => sq.score));
  const recommendedId = scoredQuotes.find((sq) => sq.score === highestScore)?.id;

  const rows: { label: string; render: (q: typeof scoredQuotes[0]) => React.ReactNode }[] = [
    { 
      label: 'Vendor', 
      render: (q) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-text-primary text-sm">{vendor(q.vendorId)?.companyName ?? '—'}</span>
          {q.id === recommendedId && (
            <div className="flex items-center gap-1.5 mt-1.5 relative">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm border border-amber-400">
                <Crown className="h-3 w-3" /> Recommended
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(showTooltip === q.id ? null : q.id);
                }} 
                className="text-primary hover:text-orange-700 transition"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              
              {showTooltip === q.id && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowTooltip(null)} />
                  <div className="absolute left-0 top-full mt-2 z-30 w-72 rounded-xl border border-orange-100 bg-white p-3.5 shadow-xl text-xs text-text-primary leading-relaxed text-left">
                    <p className="font-bold text-primary flex items-center gap-1 mb-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" /> Weighted Value Matrix
                    </p>
                    <p className="text-text-secondary">VendorBridge calculates this score based on:</p>
                    <div className="space-y-1 mt-2 text-text-secondary font-medium">
                      <div className="flex justify-between"><span>Price Competitiveness (40%)</span><span className="text-text-primary font-semibold">{q.priceScore}%</span></div>
                      <div className="flex justify-between"><span>Delivery Lead Time (30%)</span><span className="text-text-primary font-semibold">{q.deliveryScore}%</span></div>
                      <div className="flex justify-between"><span>Supplier Rating (30%)</span><span className="text-text-primary font-semibold">{q.ratingScore}%</span></div>
                    </div>
                    <p className="mt-2.5 pt-2 border-t border-brand-border text-[10px] font-bold text-emerald-600">Representing the highest combined value index.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )
    },
    { label: 'Rating', render: (q) => <RatingStars rating={vendor(q.vendorId)?.rating ?? 0} /> },
    {
      label: 'Total Amount',
      render: (q) => (
        <span className={cn('font-bold text-base', q.totalAmount === lowestPrice ? 'text-success' : 'text-text-primary')}>
          {formatCurrency(q.totalAmount)}
          {q.totalAmount === lowestPrice && <span className="ml-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">Lowest</span>}
        </span>
      ),
    },
    {
      label: 'Delivery',
      render: (q) => (
        <span className={cn(q.deliveryDays === fastestDelivery ? 'font-bold text-blue-600' : 'text-text-primary')}>
          {q.deliveryDays} days
          {q.deliveryDays === fastestDelivery && <span className="ml-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-bold">Fastest</span>}
        </span>
      ),
    },
    { 
      label: 'Overall Score', 
      render: (q) => (
        <div className="w-full max-w-[150px]">
          <div className="flex justify-between items-center text-xs font-bold text-text-primary mb-1">
            <span>Score</span>
            <span className={q.id === recommendedId ? 'text-primary' : 'text-text-secondary'}>{q.score}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
            <div 
              className={cn(
                'h-full transition-all duration-1000 rounded-full',
                q.score >= 80 ? 'bg-success' : q.score >= 60 ? 'bg-warning' : 'bg-danger'
              )}
              style={{ width: animate ? `${q.score}%` : '0%' }}
            />
          </div>
        </div>
      ) 
    },
    { label: 'Tax', render: (q) => `${q.taxRate ?? 0}% (${formatCurrency(q.taxAmount ?? 0)})` },
    { label: 'Payment Terms', render: (q) => <span className="font-medium">{q.paymentTerms ?? '—'}</span> },
    { label: 'Notes', render: (q) => <span className="text-text-secondary italic text-xs block max-w-xs">{q.notes || '—'}</span> },
  ];

  return (
    <div>
      <Link href={`/rfqs/${rfqId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to RFQ
      </Link>
      <PageHeader title="Compare Quotations" subtitle={rfq.title} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone="green"><Crown className="h-3 w-3" /> Lowest price</Badge>
        <Badge tone="blue"><Zap className="h-3 w-3" /> Fastest delivery</Badge>
        <Badge tone="orange"><Crown className="h-3 w-3 text-orange-600" /> Best Overall Value</Badge>
      </div>

      <Card className="overflow-x-auto border border-brand-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-gray-50/50">
              <th className="sticky left-0 bg-gray-50/80 backdrop-blur-sm z-10 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Criteria</th>
              {scoredQuotes.map((q) => {
                const isRec = q.id === recommendedId;
                return (
                  <th 
                    key={q.id} 
                    className={cn(
                      'min-w-[200px] px-6 py-4 text-left border-l border-brand-border transition-all duration-700',
                      isRec && animate ? 'bg-orange-50/20' : ''
                    )}
                  >
                    <span className={cn('text-sm font-bold', isRec ? 'text-primary text-base' : 'text-text-primary')}>
                      {vendor(q.vendorId)?.companyName ?? 'Vendor'}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50/30 transition">
                <td className="sticky left-0 bg-white z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">{row.label}</td>
                {scoredQuotes.map((q) => {
                  const isRec = q.id === recommendedId;
                  return (
                    <td
                      key={q.id}
                      className={cn(
                        'px-6 py-3.5 border-l border-brand-border transition-all duration-700',
                        isRec && animate ? 'bg-orange-50/10' : '',
                        q.totalAmount === lowestPrice && row.label === 'Total Amount' && 'bg-emerald-50/30',
                        q.deliveryDays === fastestDelivery && row.label === 'Delivery' && 'bg-blue-50/30',
                      )}
                    >
                      {row.render(q)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {canApprove && (
              <tr className="bg-gray-50/20">
                <td className="sticky left-0 bg-white z-10 px-4 py-4" />
                {scoredQuotes.map((q) => {
                  const isRec = q.id === recommendedId;
                  return (
                    <td 
                      key={q.id} 
                      className={cn(
                        'px-6 py-4 border-l border-brand-border transition-all duration-700',
                        isRec && animate ? 'bg-orange-50/20' : ''
                      )}
                    >
                      <Button 
                        size="sm" 
                        onClick={() => setSelected(q)} 
                        disabled={q.status === 'accepted'}
                        className={isRec ? 'bg-gradient-to-r from-orange-500 to-primary border-0 text-white shadow-md hover:shadow-lg' : ''}
                      >
                        {q.status === 'accepted' ? 'Selected' : isRec ? 'Select Recommended' : 'Select & Approve'}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={confirmSelect}
        title="Initiate approval"
        message={`Send ${vendor(selected?.vendorId ?? '')?.companyName ?? 'this vendor'}'s quotation (${formatCurrency(selected?.totalAmount ?? 0)}) for approval?`}
        confirmLabel="Initiate Approval"
        variant="primary"
        loading={acting}
      />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CompareInner />
    </Suspense>
  );
}
