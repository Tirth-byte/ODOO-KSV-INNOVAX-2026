'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Eye, Save, Send, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc, fetchCollection, where } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, parseProductDetails } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { DEFAULT_TAX_RATE } from '@/lib/constants';
import type { RFQ, LineItem, QuotationStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/Misc';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';

function SubmitQuotationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rfqId = params.get('rfqId') ?? '';
  const { user } = useAuth();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unitPrice: 0, total: 0 }]);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [validityDate, setValidityDate] = useState('');
  
  // Autosave & Preview states
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load RFQ details
  useEffect(() => {
    if (!rfqId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetchDoc<RFQ>('rfqs', rfqId);
        setRfq(r);
        if (r) {
          setItems(
            r.productDetails.map((p) => ({
              description: `${p.name} (${p.quantity} ${p.unit})`,
              qty: p.quantity,
              unitPrice: 0,
              total: 0,
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [rfqId]);

  // Load existing draft if exists
  useEffect(() => {
    if (!rfqId || !user) return;
    (async () => {
      try {
        const drafts = await fetchCollection<any>('quotations', [
          where('rfqId', '==', rfqId),
          where('vendorId', '==', user.id),
          where('status', '==', 'draft'),
        ]);
        if (drafts.length > 0) {
          const latestDraft = drafts[0];
          setDraftId(latestDraft.id);
          setItems(latestDraft.lineItems || []);
          setTaxRate(latestDraft.taxRate ?? DEFAULT_TAX_RATE);
          setDeliveryDays(latestDraft.deliveryDays || 7);
          setPaymentTerms(latestDraft.paymentTerms || 'Net 30');
          setNotes(latestDraft.notes || '');
          setValidityDate(latestDraft.validityDate || '');
          setLastSaved(new Date());
          toast.success('Restored unsaved draft quotation.');
        }
      } catch (err) {
        console.error('Error loading draft', err);
      }
    })();
  }, [rfqId, user]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.total, 0), [items]);
  const taxAmount = useMemo(() => Number(((subtotal * taxRate) / 100).toFixed(2)), [subtotal, taxRate]);
  const grandTotal = useMemo(() => Number((subtotal + taxAmount).toFixed(2)), [subtotal, taxAmount]);

  // Auto-save logic (runs every 30 seconds if form is modified)
  useEffect(() => {
    if (loading || !rfqId || !user) return;

    const interval = setInterval(async () => {
      try {
        const docData = {
          rfqId,
          vendorId: user.id,
          lineItems: items,
          totalAmount: grandTotal,
          taxRate,
          taxAmount,
          deliveryDays,
          paymentTerms,
          notes,
          status: 'draft' as const,
          validityDate: validityDate || '',
          submittedAt: serverTimestamp(),
        };

        if (draftId) {
          await updateDoc(doc(db, 'quotations', draftId), docData);
        } else {
          const ref = await addDoc(collection(db, 'quotations'), docData);
          setDraftId(ref.id);
        }
        setLastSaved(new Date());
      } catch (err) {
        console.warn('Autosave failed:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [items, taxRate, deliveryDays, paymentTerms, notes, validityDate, rfqId, user, grandTotal, taxAmount, draftId, loading]);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const merged = { ...it, ...patch };
        merged.total = Number((merged.qty * merged.unitPrice).toFixed(2));
        return merged;
      }),
    );
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', qty: 1, unitPrice: 0, total: 0 }]);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function save(status: QuotationStatus) {
    if (!user) return;
    if (!rfqId) {
      toast.error('Missing RFQ reference.');
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      toast.error('Each line item needs a description.');
      return;
    }
    setSaving(true);
    try {
      const docData = {
        rfqId,
        vendorId: user.id,
        lineItems: items,
        totalAmount: grandTotal,
        taxRate,
        taxAmount,
        deliveryDays,
        paymentTerms,
        notes,
        status,
        validityDate: validityDate || '',
        submittedAt: serverTimestamp(),
      };

      let finalId = draftId;
      if (draftId) {
        await updateDoc(doc(db, 'quotations', draftId), docData);
      } else {
        const ref = await addDoc(collection(db, 'quotations'), docData);
        finalId = ref.id;
        if (status === 'draft') {
          setDraftId(ref.id);
        }
      }

      await logActivity(
        user.id,
        status === 'submitted' ? 'submitted' : 'created',
        'Quotation',
        finalId!,
        status === 'submitted' ? `Submitted quotation for "${rfq?.title ?? rfqId}"` : `Saved draft quotation`,
        undefined,
        user.fullName,
      );
      toast.success(status === 'submitted' ? 'Quotation submitted.' : 'Draft saved.');
      router.push(`/quotations/${finalId}`);
    } catch {
      toast.error('Could not save quotation.');
    } finally {
      setSaving(false);
      setPreviewOpen(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!rfqId || !rfq) {
    return (
      <Card className="p-8 text-center">
        <p className="text-text-secondary">No RFQ selected. Open an RFQ and click &quot;Submit Quotation&quot;.</p>
        <Link href="/rfqs" className="mt-3 inline-block">
          <Button variant="secondary">Browse RFQs</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl page-enter">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/rfqs/${rfqId}`} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
          <ArrowLeft className="h-4 w-4" /> Back to RFQ
        </Link>
        {lastSaved && (
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary bg-gray-50 border border-brand-border px-2.5 py-1 rounded-full">
            <Clock className="h-3 w-3 text-emerald-500 animate-pulse" />
            Last autosaved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
      <PageHeader title="Submit Quotation" subtitle={`Responding to: ${rfq.title}`} />

      <Card className="mb-5">
        <CardHeader tinted>
          <CardTitle>RFQ Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-4">
          <p className="text-text-primary leading-relaxed">{rfq.description}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-3">Requested items:</p>
          <ul className="list-inside list-disc text-text-primary space-y-0.5 text-xs font-medium">
            {parseProductDetails(rfq).map((p, i) => (
              <li key={i}>{p.name} — {p.quantity} {p.unit}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-3">
            {/* Enhanced Line Items Table */}
            <div className="hidden grid-cols-12 gap-3 text-xs font-bold uppercase tracking-wider text-text-secondary sm:grid border-b border-brand-border pb-2">
              <span className="col-span-6">Description</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit Price (₹)</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-3 bg-gray-50/30 p-2 sm:p-0 rounded-xl sm:bg-transparent border border-brand-border sm:border-0">
                <div className="col-span-12 sm:col-span-6">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1 sm:hidden">Description</span>
                  <Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Item description" />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1 sm:hidden">Qty</span>
                  <Input type="number" min="0" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1 sm:hidden">Unit Price (₹)</span>
                  <Input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-10 sm:col-span-1 text-sm font-semibold text-text-primary text-right">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1 sm:hidden text-left">Total</span>
                  {formatCurrency(it.total)}
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-center mt-4 sm:mt-0">
                  <button type="button" onClick={() => removeItem(i)} className="flex justify-center text-text-secondary hover:text-danger p-1 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" type="button" onClick={addItem} className="mt-2">
              <Plus className="h-4 w-4" /> Add line item
            </Button>
          </div>

          {/* Form details */}
          <div className="grid grid-cols-1 gap-4 border-t border-brand-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="delivery">Delivery days</Label>
              <Input id="delivery" type="number" min="0" value={deliveryDays} onChange={(e) => setDeliveryDays(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="tax">Tax rate (%)</Label>
              <Input id="tax" type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="terms">Payment terms</Label>
              <Input id="terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="validityDate">Validity Date</Label>
              <Input id="validityDate" type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional terms, comments, or technical details..." />
          </div>

          <div className="ml-auto w-full max-w-xs space-y-2 border-t border-brand-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary font-medium">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary font-medium">Tax ({taxRate}%)</span><span className="font-semibold">{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between border-t border-brand-border pt-2 text-base font-bold"><span>Grand Total</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
            <Button variant="secondary" type="button" loading={saving} onClick={() => save('draft')}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button variant="secondary" type="button" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button type="button" loading={saving} onClick={() => save('submitted')}>
              <Send className="h-4 w-4" /> Submit Quotation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium Quotation Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Quotation Document Preview" className="max-w-2xl">
        <div className="p-6 space-y-6 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-brand-border pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-primary">QUOTATION</h2>
              <p className="text-xs text-text-secondary mt-1">RFQ Ref: #{rfqId.slice(-6).toUpperCase()}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-text-primary">{user?.fullName}</p>
              <p className="text-text-secondary">{user?.email}</p>
            </div>
          </div>

          {/* Quotation Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-text-secondary block">Prepared For</span>
              <p className="font-medium text-text-primary mt-1">VendorBridge Client</p>
              <p className="text-text-secondary">RFQ Title: {rfq.title}</p>
            </div>
            <div className="text-right">
              <span className="font-bold uppercase tracking-wider text-text-secondary block">Validity & Delivery</span>
              <p className="font-medium text-text-primary mt-1">Validity Date: {validityDate ? formatDate(validityDate) : '—'}</p>
              <p className="text-text-secondary">Expected Lead Time: {deliveryDays} days</p>
              <p className="text-text-secondary">Terms: {paymentTerms}</p>
            </div>
          </div>

          {/* Line items preview */}
          <div>
            <span className="font-bold uppercase tracking-wider text-text-secondary text-[10px] block mb-2">Line Items Summary</span>
            <Table>
              <THead>
                <TR>
                  <TH>Description</TH>
                  <TH className="w-16">Qty</TH>
                  <TH className="w-28 text-right">Unit Price</TH>
                  <TH className="w-28 text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((it, idx) => (
                  <TR key={idx}>
                    <TD className="font-medium text-text-primary">{it.description || '—'}</TD>
                    <TD>{it.qty}</TD>
                    <TD className="text-right">{formatCurrency(it.unitPrice)}</TD>
                    <TD className="text-right font-semibold text-text-primary">{formatCurrency(it.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-end pt-2">
            <div className="w-full max-w-xs space-y-2 text-xs border-t border-brand-border pt-4">
              <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Tax ({taxRate}%)</span><span className="font-semibold">{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-sm font-bold text-text-primary border-t border-brand-border pt-2"><span>Grand Total</span><span className="text-primary font-black">{formatCurrency(grandTotal)}</span></div>
            </div>
          </div>

          {notes && (
            <div className="border-t border-brand-border pt-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-text-secondary block mb-1">Notes & Terms</span>
              <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-brand-border mt-6">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save('submitted')} loading={saving}>
              <Send className="h-4 w-4" /> Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SubmitQuotationPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SubmitQuotationInner />
    </Suspense>
  );
}
