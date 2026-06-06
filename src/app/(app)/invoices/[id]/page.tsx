'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Receipt, 
  Download, 
  Printer, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  CreditCard,
  Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { downloadElementAsPdf } from '@/lib/pdf';
import { formatDate, cn } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Invoice, Vendor, PurchaseOrder, InvoiceStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Select, Input, Label } from '@/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';

import { LogoFull } from '@/components/ui/Logo';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const editable = can(role, 'manageInvoices');
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  // Mark Paid Form State
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  useEffect(() => {
    (async () => {
      const inv = await fetchDoc<Invoice>('invoices', id);
      setInvoice(inv);
      if (inv) {
        setVendor(await fetchDoc<Vendor>('vendors', inv.vendorId));
        setPo(await fetchDoc<PurchaseOrder>('purchaseOrders', inv.poId));
      }
      setLoading(false);
    })();
  }, [id]);

  async function setStatus(status: InvoiceStatus) {
    if (!invoice || !user) return;
    try {
      const patch: Record<string, unknown> = { status };
      if (status === 'paid') {
        patch.paidAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'invoices', invoice.id), patch);
      await logActivity(user.id, status, 'Invoice', invoice.id, `Marked ${invoice.invoiceNumber} as ${status}`, undefined, user.fullName);
      setInvoice({ ...invoice, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined });
      toast.success('Invoice updated.');
      
      if (status === 'paid') {
        fireConfetti();
      }
    } catch {
      toast.error('Could not update invoice.');
    }
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !user) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'paid',
        paidAt: paymentDate,
      });
      await logActivity(
        user.id,
        'paid',
        'Invoice',
        invoice.id,
        `Marked invoice ${invoice.invoiceNumber} as paid on ${paymentDate}`,
        { paidAt: paymentDate },
        user.fullName
      );
      
      // Email simulate dispatch log
      await logActivity(
        'system',
        'notification',
        'Invoice',
        invoice.id,
        `Payment receipt email dispatched to vendor`,
        undefined,
        'System'
      );

      toast.success('Invoice marked as Paid.');
      setShowMarkPaidModal(false);
      setInvoice({ ...invoice, status: 'paid', paidAt: paymentDate });
      fireConfetti();
    } catch {
      toast.error('Could not update invoice.');
    } finally {
      setBusy(false);
    }
  }

  function fireConfetti() {
    setTriggerConfetti(true);
    setTimeout(() => setTriggerConfetti(false), 5000);
  }

  async function handleDownload() {
    if (!printRef.current || !invoice) return;
    setBusy(true);
    try {
      await downloadElementAsPdf(printRef.current, `${invoice.invoiceNumber}.pdf`);
    } catch {
      toast.error('Could not generate PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendEmail() {
    if (!invoice || !user || !vendor) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          to: vendor.email,
          vendorName: vendor.companyName,
          lineItems: invoice.lineItems,
          subtotal: invoice.subtotal,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          grandTotal: invoice.grandTotal,
          dueDate: typeof invoice.dueDate === 'string' ? invoice.dueDate : new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not send email.');
        return;
      }
      await updateDoc(doc(db, 'invoices', invoice.id), { status: 'sent', sentAt: serverTimestamp() });
      await logActivity(user.id, 'sent', 'Invoice', invoice.id, `Emailed invoice ${invoice.invoiceNumber} to ${vendor.email}`, undefined, user.fullName);
      
      // System log simulating the dispatch
      await logActivity(
        'system',
        'notification',
        'Invoice',
        invoice.id,
        `Notification sent to vendor`,
        undefined,
        'System'
      );

      setInvoice({ ...invoice, status: 'sent' });
      toast.success('Invoice emailed to vendor.');
    } catch {
      toast.error('Could not send email.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!invoice) return <EmptyState icon={Receipt} title="Invoice not found" action={<Button onClick={() => router.push('/invoices')}>Back</Button>} />;

  // Overdue check: past due date + not paid
  const isOverdue = invoice.status !== 'paid' && invoice.dueDate && new Date() > new Date(
    typeof invoice.dueDate === 'string' 
      ? invoice.dueDate 
      : (invoice.dueDate as any).toDate?.() || invoice.dueDate
  );

  return (
    <div className="relative page-enter">
      
      {/* CSS Confetti Overlay */}
      {triggerConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => {
            const randomX = Math.random() * 100;
            const randomDelay = Math.random() * 3;
            const randomDuration = 2 + Math.random() * 2;
            const colors = ['#f97316', '#3b82f6', '#10b981', '#eab308', '#ec4899', '#a855f7'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            return (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm opacity-85 animate-bounce"
                style={{
                  top: '-10px',
                  left: `${randomX}%`,
                  backgroundColor: randomColor,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `fallDown ${randomDuration}s linear ${randomDelay}s infinite`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes fallDown {
              0% { top: -10px; transform: translateY(0) rotate(0deg); }
              100% { top: 110%; transform: translateY(100vh) rotate(720deg); }
            }
          `}</style>
        </div>
      )}

      <div className="no-print">
        <Link href="/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle="Invoice document"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {editable && (
                <Select value={invoice.status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className="w-36 bg-white border border-brand-border">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </Select>
              )}
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload} loading={busy}>
                <Download className="h-4 w-4" /> PDF
              </Button>
              {editable && (
                <Button size="sm" onClick={handleSendEmail} loading={sending}>
                  <Mail className="h-4 w-4" /> Send Email
                </Button>
              )}
              {editable && invoice.status !== 'paid' && (
                <Button variant="success" size="sm" onClick={() => setShowMarkPaidModal(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Overdue Warning Banner */}
      {isOverdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 animate-pulse no-print">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Overdue Payment Notice</h4>
            <p className="text-xs mt-1">
              This invoice has passed its due date of {formatDate(invoice.dueDate)} and is currently unpaid. Please record payment immediately.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Card Container */}
      <Card className="print-area mx-auto max-w-3xl relative overflow-hidden bg-white border border-brand-border shadow-xl p-8" ref={printRef}>
        <CardContent className="space-y-8">
          
          {/* PAID Watermark Overlay */}
          {invoice.status === 'paid' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 rotate-[25deg]">
              <div className="border-[10px] border-emerald-500/20 text-emerald-500/20 rounded-3xl px-12 py-5 font-black text-8xl tracking-widest uppercase">
                PAID
              </div>
            </div>
          )}

          {/* Invoice Document Header */}
          <div className="flex flex-col justify-between gap-6 border-b border-brand-border pb-6 sm:flex-row sm:items-start">
            <LogoFull iconSize={40} wordSize="md" />
            <div className="sm:text-right">
              <span className="text-xs font-bold tracking-widest text-primary uppercase block">Invoice Document</span>
              <p className="text-2xl font-black text-text-primary mt-1">{invoice.invoiceNumber}</p>
              <div className="mt-2 flex justify-end gap-1.5 items-center">
                <StatusBadge status={invoice.status} />
                {isOverdue && (
                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Billing Info Blocks */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 text-sm">
            <div className="rounded-xl bg-orange-50/20 border border-brand-border p-4">
              <span className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5 mb-2">
                <Building className="h-3.5 w-3.5 text-primary" />
                <span>Bill To:</span>
              </span>
              <p className="font-bold text-text-primary">{vendor?.companyName ?? '—'}</p>
              <p className="text-text-secondary">{vendor?.email}</p>
              <p className="text-text-secondary">{vendor?.phone}</p>
              <p className="text-text-secondary">{vendor?.country}</p>
            </div>
            <div className="rounded-xl bg-orange-50/20 border border-brand-border p-4 sm:text-right">
              <span className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5 sm:justify-end mb-2">
                <span>Bill From:</span>
              </span>
              <p className="font-bold text-text-primary">VendorBridge Inc.</p>
              <p className="text-text-secondary mt-1">PO Link: <span className="font-semibold text-text-primary">{po?.poNumber ?? '—'}</span></p>
              <p className="text-text-secondary">Issued: <span className="font-medium text-text-primary">{formatDate(invoice.createdAt)}</span></p>
              <p className={cn("text-text-secondary", isOverdue && "text-red-600 font-bold")}>
                Due Date: <span className="font-medium">{formatDate(invoice.dueDate)}</span> {isOverdue && "(Overdue)"}
              </p>
              {invoice.paidAt && (
                <p className="text-emerald-600 font-bold mt-1 text-xs">
                  Paid On: {formatDate(invoice.paidAt)}
                </p>
              )}
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
                {invoice.lineItems.map((it, i) => (
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

          {/* Tax Breakdown & Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-medium text-text-primary">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Tax ({invoice.taxRate}%)</span>
                <span className="font-medium text-text-primary">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-2.5 text-base font-black">
                <span>Grand Total Due</span>
                <span className="text-primary text-lg">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms & Bank Details (Step 7 Details) */}
          {vendor && (vendor.paymentTerms || vendor.bankName) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-brand-border text-xs">
              {vendor.paymentTerms && (
                <div>
                  <h4 className="font-bold text-text-primary mb-1 uppercase tracking-wide text-text-secondary">Payment Terms</h4>
                  <p className="text-text-secondary leading-normal">{vendor.paymentTerms}</p>
                </div>
              )}
              {vendor.bankName && (
                <div>
                  <h4 className="font-bold text-text-primary mb-1 uppercase tracking-wide text-text-secondary flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    <span>Bank Payment Account</span>
                  </h4>
                  <p className="text-text-secondary leading-normal">
                    Bank Name: <span className="font-semibold text-text-primary">{vendor.bankName}</span><br />
                    Account Name: <span className="font-semibold text-text-primary">{vendor.bankAccountName || '—'}</span><br />
                    Account Number: <span className="font-semibold text-text-primary">{vendor.bankAccountNumber || '—'}</span><br />
                    IFSC Code: <span className="font-semibold text-text-primary">{vendor.bankIfscCode || '—'}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="border-t border-brand-border pt-4 text-center text-xs text-text-secondary">
            Thank you for your business. For billing queries, reach out to billing@vendorbridge.app.
          </p>
        </CardContent>
      </Card>

      {/* Record Payment / Mark Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>Record Invoice Payment</span>
              </h3>
              <button onClick={() => setShowMarkPaidModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4">
              <div>
                <Label htmlFor="payment-date">Payment Settlement Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs leading-normal">
                Recording payment will set the invoice status to <strong>Paid</strong> and trigger a simulation payment receipt notification log.
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="success" className="flex-1" loading={busy}>
                  Confirm Paid
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowMarkPaidModal(false)} disabled={busy}>
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
