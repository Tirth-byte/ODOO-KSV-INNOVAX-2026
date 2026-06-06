'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Download, 
  Printer, 
  FileText, 
  Calendar, 
  Truck, 
  CheckCircle, 
  Plus, 
  User, 
  ClipboardCheck,
  Building,
  MapPin
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { nextSequence, formatInvoiceNumber } from '@/lib/numbering';
import { downloadElementAsPdf } from '@/lib/pdf';
import { formatDate, formatDateTime, cn, toDate } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { PurchaseOrder, Vendor, POStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Select, Input, Textarea, Label } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';

import { LogoFull } from '@/components/ui/Logo';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const editable = can(role, 'managePO');
  const printRef = useRef<HTMLDivElement>(null);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);

  // Delivery Note Form State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryRef, setDeliveryRef] = useState('');
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  async function load() {
    const p = await fetchDoc<PurchaseOrder>('purchaseOrders', id);
    setPo(p);
    if (p) {
      setVendor(await fetchDoc<Vendor>('vendors', p.vendorId));
      const snap = await getDocs(query(collection(db, 'invoices'), where('poId', '==', p.id)));
      setExistingInvoiceId(snap.empty ? null : snap.docs[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: POStatus) {
    if (!po || !user) return;
    try {
      await updateDoc(doc(db, 'purchaseOrders', po.id), { status });
      await logActivity(user.id, 'updated', 'PO', po.id, `Set ${po.poNumber} to ${status}`, undefined, user.fullName);
      toast.success('Status updated.');
      setPo({ ...po, status });
    } catch {
      toast.error('Could not update status.');
    }
  }

  async function generateInvoice() {
    if (!po || !user) return;
    if (existingInvoiceId) {
      router.push(`/invoices/${existingInvoiceId}`);
      return;
    }
    setBusy(true);
    try {
      const seq = await nextSequence('invoice');
      const invoiceNumber = formatInvoiceNumber(seq);
      const due = new Date();
      due.setDate(due.getDate() + 30);
      const ref = await addDoc(collection(db, 'invoices'), {
        invoiceNumber,
        poId: po.id,
        vendorId: po.vendorId,
        rfqId: po.rfqId,
        lineItems: po.lineItems,
        subtotal: po.subtotal,
        taxRate: po.taxRate,
        taxAmount: po.taxAmount,
        grandTotal: po.grandTotal,
        status: 'draft',
        dueDate: due.toISOString(),
        createdAt: serverTimestamp(),
      });
      await logActivity(user.id, 'generated', 'Invoice', ref.id, `Generated invoice ${invoiceNumber} from ${po.poNumber}`, { invoiceNumber }, user.fullName);
      toast.success(`Invoice ${invoiceNumber} created.`);
      router.push(`/invoices/${ref.id}`);
    } catch {
      toast.error('Could not generate invoice.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!printRef.current || !po) return;
    setBusy(true);
    try {
      await downloadElementAsPdf(printRef.current, `${po.poNumber}.pdf`);
    } catch {
      toast.error('Could not generate PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddDeliveryNote(e: React.FormEvent) {
    e.preventDefault();
    if (!po || !user) return;
    setBusy(true);
    try {
      const note = {
        deliveryRef,
        actualDate,
        notes: deliveryNotes,
        receivedBy: receivedBy || user.fullName,
      };
      await updateDoc(doc(db, 'purchaseOrders', po.id), {
        status: 'delivered',
        deliveryNote: note,
        deliveryDate: actualDate,
      });

      await logActivity(
        user.id,
        'delivered',
        'PO',
        po.id,
        `Added delivery note for ${po.poNumber} — status set to delivered`,
        { note },
        user.fullName
      );

      toast.success('Delivery note added and PO marked as Delivered.');
      setShowDeliveryModal(false);
      setDeliveryRef('');
      setDeliveryNotes('');
      setReceivedBy('');
      load();
    } catch (err) {
      toast.error('Could not save delivery note.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!po) return <EmptyState icon={ShoppingCart} title="Purchase order not found" action={<Button onClick={() => router.push('/purchase-orders')}>Back</Button>} />;

  const timelineSteps = [
    { label: 'Created', done: true, icon: ClipboardCheck, date: po.createdAt, color: 'bg-blue-500' },
    { label: 'Confirmed', done: po.status === 'confirmed' || po.status === 'delivered', icon: CheckCircle, date: po.poDate, color: 'bg-emerald-500' },
    { label: 'Delivered', done: po.status === 'delivered', icon: Truck, date: po.deliveryNote?.actualDate ?? po.deliveryDate, color: 'bg-orange-500' },
  ];

  return (
    <div className="page-enter">
      <div className="no-print">
        <Link href="/purchase-orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to purchase orders
        </Link>
        <PageHeader
          title={po.poNumber}
          subtitle="Purchase order"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {editable && (
                <Select value={po.status} onChange={(e) => updateStatus(e.target.value as POStatus)} className="w-40 bg-white border border-brand-border">
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              )}
              {po.status !== 'delivered' && editable && (
                <Button size="sm" variant="success" onClick={() => setShowDeliveryModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Delivery Note
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload} loading={busy}>
                <Download className="h-4 w-4" /> PDF
              </Button>
              {editable && (
                <Button size="sm" onClick={generateInvoice} loading={busy}>
                  <FileText className="h-4 w-4 mr-1" /> {existingInvoiceId ? 'View Invoice' : 'Generate Invoice'}
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main PO Document Layout */}
        <div className="lg:col-span-2">
          <Card className="print-area shadow-lg border border-brand-border p-8 bg-white" ref={printRef}>
            <CardContent className="space-y-8">
              
              <div className="flex flex-col justify-between gap-6 border-b border-brand-border pb-6 sm:flex-row">
                <LogoFull iconSize={40} wordSize="md" />
                <div className="text-right sm:text-right">
                  <span className="text-sm font-bold tracking-widest text-primary uppercase block">Purchase Order</span>
                  <span className="text-2xl font-black text-text-primary block mt-1">{po.poNumber}</span>
                  <div className="mt-2"><StatusBadge status={po.status} /></div>
                </div>
              </div>

              {/* Bill To & Ship To Sections */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-sm">
                <div className="rounded-xl bg-orange-50/30 border border-orange-100 p-4">
                  <div className="flex items-center gap-1.5 font-bold text-orange-950 mb-2">
                    <Building className="h-4 w-4 text-primary" />
                    <span>Bill To:</span>
                  </div>
                  <p className="font-bold text-text-primary">VendorBridge Inc.</p>
                  <p className="text-text-secondary mt-1">Accounts Payable Department</p>
                  <p className="text-text-secondary">100 Innovation Way, Tech Park</p>
                  <p className="text-text-secondary">Bangalore, KA, 560001</p>
                  <p className="text-xs text-text-secondary mt-1">GST: 29AAAAA1111A1Z1</p>
                </div>
                <div className="rounded-xl bg-orange-50/30 border border-orange-100 p-4">
                  <div className="flex items-center gap-1.5 font-bold text-orange-950 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Ship To:</span>
                  </div>
                  <p className="font-bold text-text-primary">VendorBridge Warehouse</p>
                  <p className="text-text-secondary mt-1">Attn: Receiving Manager</p>
                  <p className="text-text-secondary">Plot 45, Industrial Area Phase 2</p>
                  <p className="text-text-secondary">Bangalore, KA, 560099</p>
                  <p className="text-xs text-text-secondary mt-1">Contact: warehouse@vendorbridge.in</p>
                </div>
              </div>

              {/* Vendor & Order Metadata */}
              <div className="grid grid-cols-1 gap-6 py-4 border-y border-brand-border md:grid-cols-2 text-sm">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Vendor Details</h4>
                  <p className="font-bold text-text-primary">{vendor?.companyName ?? '—'}</p>
                  <p className="text-text-secondary">{vendor?.email}</p>
                  <p className="text-text-secondary">{vendor?.phone}</p>
                  <p className="text-text-secondary">{vendor?.country}</p>
                  {vendor?.paymentTerms && (
                    <p className="text-xs text-text-secondary mt-1">Payment Terms: <span className="font-semibold text-text-primary">{vendor.paymentTerms}</span></p>
                  )}
                </div>
                <div className="md:text-right">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Order Details</h4>
                  <p className="text-text-primary">PO Date: <span className="font-semibold">{formatDate(po.poDate ?? po.createdAt)}</span></p>
                  <p className="text-text-primary">Exp. Delivery Date: <span className="font-semibold">{formatDate(po.deliveryDate) === '—' ? 'TBD' : formatDate(po.deliveryDate)}</span></p>
                  <p className="text-text-primary">Creator Code: <span className="font-semibold uppercase">{po.createdBy.slice(0, 8)}</span></p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden rounded-xl border border-brand-border">
                <Table>
                  <THead>
                    <TR>
                      <TH className="bg-orange-50/50">Description</TH>
                      <TH className="bg-orange-50/50 text-right">Qty</TH>
                      <TH className="bg-orange-50/50 text-right">Unit Price</TH>
                      <TH className="bg-orange-50/50 text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {po.lineItems.map((it, i) => (
                      <TR key={i} className={i % 2 === 1 ? 'bg-orange-50/10' : ''}>
                        <TD className="font-medium text-text-primary py-3">{it.description}</TD>
                        <TD className="text-right py-3">{it.qty}</TD>
                        <TD className="text-right py-3">{formatCurrency(it.unitPrice)}</TD>
                        <TD className="text-right font-semibold text-text-primary py-3">{formatCurrency(it.total)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="font-medium text-text-primary">{formatCurrency(po.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tax ({po.taxRate}%)</span>
                    <span className="font-medium text-text-primary">{formatCurrency(po.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-border pt-2.5 text-base font-black">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrency(po.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-dashed border-brand-border">
                <div>
                  <p className="font-bold text-text-primary mb-1">Terms & Conditions</p>
                  <p className="text-text-secondary leading-relaxed">
                    1. Goods must be delivered within the stipulated delivery period.<br />
                    2. Invoices must reference this Purchase Order Number.<br />
                    3. Payments are subject to inspection and approval of delivered items.
                  </p>
                </div>
                <div className="flex flex-col items-end justify-end text-right">
                  <div className="h-12 border-b border-brand-border w-48 mb-1"></div>
                  <p className="font-bold text-text-primary">Authorized Signatory</p>
                  <p className="text-text-secondary">VendorBridge Procurement Dept.</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info & Timeline */}
        <div className="space-y-6 no-print">
          
          {/* Timeline Card */}
          <Card>
            <CardHeader><CardTitle>Tracking Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  {timelineSteps.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <li key={step.label}>
                        <div className="relative pb-8">
                          {idx !== timelineSteps.length - 1 && (
                            <span className={cn("absolute left-4 top-4 -ml-px h-full w-0.5", step.done ? "bg-emerald-500" : "bg-brand-border")} aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white ring-4 ring-white shadow-sm", 
                                step.done ? step.color : "bg-gray-200 text-gray-400"
                              )}>
                                <Icon className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                                <p className="text-xs text-text-secondary">
                                  {step.done ? `Completed step` : `Awaiting status change`}
                                </p>
                              </div>
                              <div className="whitespace-nowrap text-right text-xs text-text-secondary font-medium">
                                {step.date ? formatDate(step.date) : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Note Details (if present) */}
          {po.deliveryNote && (
            <Card className="border border-orange-200 bg-orange-50/10">
              <CardHeader className="bg-orange-50/30">
                <CardTitle className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Delivery Note Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Ref / Challan No:</span>
                  <span className="font-semibold text-text-primary">{po.deliveryNote.deliveryRef || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Received Date:</span>
                  <span className="font-semibold text-text-primary">{formatDate(po.deliveryNote.actualDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Received By:</span>
                  <span className="font-semibold text-text-primary">{po.deliveryNote.receivedBy || '—'}</span>
                </div>
                {po.deliveryNote.notes && (
                  <div className="border-t border-brand-border pt-2 mt-2">
                    <span className="text-text-secondary block mb-1">Notes:</span>
                    <p className="text-text-primary leading-normal italic">&ldquo;{po.deliveryNote.notes}&rdquo;</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prompt to Add Delivery Note if not delivered */}
          {po.status !== 'delivered' && editable && (
            <Card className="border border-dashed border-primary/40 bg-orange-50/10">
              <CardContent className="p-4 text-center space-y-3">
                <Truck className="h-8 w-8 text-primary mx-auto opacity-70" />
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Fulfillment Details</h4>
                  <p className="text-xs text-text-secondary mt-1">Has this shipment arrived? Document it with a delivery note and update the PO status.</p>
                </div>
                <Button variant="secondary" size="sm" className="w-full bg-white border border-primary/20" onClick={() => setShowDeliveryModal(true)}>
                  Add Delivery Note
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Add Delivery Note Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Add Delivery Note</span>
              </h3>
              <button onClick={() => setShowDeliveryModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleAddDeliveryNote} className="space-y-4">
              <div>
                <Label htmlFor="delivery-ref">Challan / Delivery Reference #</Label>
                <Input
                  id="delivery-ref"
                  required
                  placeholder="e.g. CH-9821-X"
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="actual-date">Delivery Date</Label>
                <Input
                  id="actual-date"
                  type="date"
                  required
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="received-by">Received By (Optional)</Label>
                <Input
                  id="received-by"
                  placeholder={user?.fullName || "Name"}
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="delivery-notes">Remarks / Discrepancy Notes</Label>
                <Textarea
                  id="delivery-notes"
                  placeholder="Describe goods condition, packages count, discrepancy if any..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="success" className="flex-1" loading={busy}>
                  Submit & Set Delivered
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowDeliveryModal(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
