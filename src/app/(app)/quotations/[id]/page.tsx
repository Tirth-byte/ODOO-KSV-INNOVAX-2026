'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ClipboardList, CheckCircle2, XCircle, Calendar, ShieldCheck, Mail, Phone, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { initiateApproval } from '@/lib/workflow';
import { formatDate, formatDateTime, toDate } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Quotation, RFQ, Vendor } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, RatingStars } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const canReview = can(role, 'reviewQuotation') || can(role, 'approve');

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    setLoading(true);
    let active = true;

    const unsubQuote = onSnapshot(doc(db, 'quotations', id), async (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const q = { id: snap.id, ...snap.data() } as Quotation;
      if (active) {
        setQuotation(q);
        try {
          const [r, v] = await Promise.all([
            fetchDoc<RFQ>('rfqs', q.rfqId),
            fetchDoc<Vendor>('vendors', q.vendorId),
          ]);
          if (active) {
            setRfq(r);
            setVendor(v);
          }
        } catch (err) {
          console.error(err);
        } finally {
          if (active) setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubQuote();
    };
  }, [id]);

  async function handleAccept() {
    if (!quotation || !user) return;
    setActing(true);
    try {
      await initiateApproval(quotation, user);
      toast.success('Approval request created.');
      router.push('/approvals');
    } catch {
      toast.error('Could not initiate approval.');
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!quotation || !user) return;
    setActing(true);
    try {
      await updateDoc(doc(db, 'quotations', quotation.id), { status: 'rejected', resolvedAt: serverTimestamp() });
      await logActivity(user.id, 'rejected', 'Quotation', quotation.id, `Rejected quotation from ${vendor?.companyName ?? 'vendor'}`, undefined, user.fullName);
      toast.success('Quotation rejected.');
      setConfirmReject(false);
    } catch {
      toast.error('Could not reject quotation.');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!quotation) {
    return <EmptyState icon={ClipboardList} title="Quotation not found" action={<Button onClick={() => router.push('/quotations')}>Back</Button>} />;
  }

  const subtotal = quotation.lineItems.reduce((s, it) => s + it.total, 0);
  const showActions = canReview && quotation.status === 'submitted';

  return (
    <div className="mx-auto max-w-4xl page-enter">
      <Link href="/quotations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </Link>

      <PageHeader
        title="Quotation Document"
        subtitle={rfq ? `Responding to RFQ: ${rfq.title}` : undefined}
        action={
          showActions && (
            <div className="flex gap-2">
              <Button variant="success" onClick={handleAccept} loading={acting}>
                <CheckCircle2 className="h-4 w-4" /> Accept & Request Approval
              </Button>
              <Button variant="danger" onClick={() => setConfirmReject(true)} disabled={acting}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          )
        }
      />

      {/* Premium Quotation Document Wrapper */}
      <Card className="border border-brand-border overflow-hidden">
        {/* Banner with Document details */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-primary">QUOTATION</h2>
            <p className="text-xs text-text-secondary mt-1">ID: #{quotation.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">Status:</span>
            <StatusBadge status={quotation.status} />
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b border-brand-border bg-white text-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">Supplier Profile</span>
            <p className="text-lg font-bold text-text-primary mt-1.5">{vendor?.companyName ?? 'Supplier Name'}</p>
            {vendor && (
              <div className="flex items-center gap-2 mt-1.5">
                <RatingStars rating={vendor.rating ?? 0} size={14} />
                <span className="text-xs text-text-secondary">({vendor.category})</span>
              </div>
            )}
            <div className="space-y-1.5 mt-3 text-text-secondary text-xs">
              <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {vendor?.email}</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {vendor?.phone}</p>
              {vendor?.gstNumber && <p className="font-semibold text-text-primary">GSTIN: {vendor.gstNumber}</p>}
            </div>
          </div>
          
          <div className="md:text-right flex flex-col md:items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">Validity & Lead Time</span>
              <p className="font-semibold text-text-primary mt-1.5 flex md:justify-end items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Valid Until: {quotation.validityDate ? formatDate(quotation.validityDate) : '—'}
              </p>
              <p className="text-text-secondary text-xs mt-1">Delivery Lead Time: {quotation.deliveryDays} days</p>
              <p className="text-text-secondary text-xs mt-0.5">Payment Terms: {quotation.paymentTerms ?? 'Net 30'}</p>
            </div>
            
            <div className="mt-4 md:mt-0 text-left md:text-right text-xs">
              <span className="text-text-secondary block font-medium">Submitted Date</span>
              <p className="font-semibold text-text-primary mt-0.5">{formatDate(quotation.submittedAt)}</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white">
          <Table>
            <THead>
              <TR>
                <TH>Description</TH>
                <TH className="w-20">Quantity</TH>
                <TH className="w-32 text-right">Unit Price</TH>
                <TH className="w-32 text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {quotation.lineItems.map((it, i) => (
                <TR key={i}>
                  <TD className="font-semibold text-text-primary">{it.description}</TD>
                  <TD className="font-medium text-text-secondary">{it.qty}</TD>
                  <TD className="text-right text-text-secondary">{formatCurrency(it.unitPrice)}</TD>
                  <TD className="text-right font-semibold text-text-primary">{formatCurrency(it.total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        {/* Totals & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white border-t border-brand-border text-sm">
          <div>
            {quotation.notes && (
              <div className="bg-gray-50 border border-brand-border rounded-xl p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1.5">Supplier Notes</span>
                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            <div className="w-full max-w-xs space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Subtotal</span>
                <span className="font-semibold text-text-primary">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Tax ({quotation.taxRate ?? 0}%)</span>
                <span className="font-semibold text-text-primary">{formatCurrency(quotation.taxAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-2 text-base font-black text-text-primary">
                <span>Grand Total</span>
                <span className="text-primary font-black text-lg">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        title="Reject quotation"
        message="This will mark the quotation as rejected. Continue?"
        confirmLabel="Reject"
        loading={acting}
      />
    </div>
  );
}
