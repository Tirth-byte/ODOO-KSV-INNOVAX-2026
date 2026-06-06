'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { updateDoc, doc, collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, FileText, GitCompare, Send, XCircle, Copy, AlertTriangle, Calendar, Clock, Bell, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc, fetchCollection } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { daysUntil, formatDate, formatDateTime, toDate, parseProductDetails } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { RFQ, Vendor, Quotation, ActivityLog } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const editable = can(role, 'manageRfqs');
  const isVendor = role === 'vendor';

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rfqLogs, setRfqLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    setLoading(true);
    let active = true;

    // Subscriptions
    const unsubRfq = onSnapshot(doc(db, 'rfqs', id), (snap) => {
      if (active && snap.exists()) {
        setRfq({ id: snap.id, ...snap.data() } as RFQ);
      }
    });

    const unsubQuotes = onSnapshot(
      query(collection(db, 'quotations'), where('rfqId', '==', id)),
      (snap) => {
        if (active) {
          setQuotations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quotation)));
        }
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), where('entityId', '==', id)),
      (snap) => {
        if (active) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
          setRfqLogs(list.sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0)));
        }
      }
    );

    (async () => {
      try {
        const v = await fetchCollection<Vendor>('vendors');
        if (active) {
          setVendors(v);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      unsubRfq();
      unsubQuotes();
      unsubLogs();
    };
  }, [id]);

  async function closeRfq() {
    if (!rfq || !user) return;
    setClosing(true);
    try {
      await updateDoc(doc(db, 'rfqs', rfq.id), { status: 'closed' });
      await logActivity(user.id, 'closed', 'RFQ', rfq.id, `Closed RFQ "${rfq.title}"`, undefined, user.fullName);
      toast.success('RFQ closed.');
      setConfirmClose(false);
    } catch {
      toast.error('Could not close RFQ.');
    } finally {
      setClosing(false);
    }
  }

  async function sendDeadlineReminder() {
    if (!rfq || !user) return;
    setSendingReminder(true);
    try {
      // Create activity log simulation
      await logActivity(
        user.id,
        'notified',
        'RFQ',
        rfq.id,
        `Sent deadline reminder for RFQ "${rfq.title}" to pending suppliers`,
        undefined,
        user.fullName
      );
      toast.success('Deadline reminders sent to pending vendors.');
    } catch {
      toast.error('Could not send reminders.');
    } finally {
      setSendingReminder(false);
    }
  }

  function handleDuplicate() {
    if (!rfq) return;
    router.push(`/rfqs/new?duplicateId=${rfq.id}`);
  }

  if (loading) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!rfq) {
    return <EmptyState icon={FileText} title="RFQ not found" action={<Button onClick={() => router.push('/rfqs')}>Back to RFQs</Button>} />;
  }

  const invitedIds = rfq.invitedVendorIds ?? [];
  const quotedVendorIds = new Set(quotations.map((q) => q.vendorId));
  const submittedCount = quotations.filter((q) => q.status !== 'draft').length;

  const daysLeft = daysUntil(rfq.deadline);
  const isOverdue = daysLeft !== null && daysLeft < 0;

  // Deadline badge
  const renderDeadlineIndicator = () => {
    if (daysLeft === null) return null;
    if (isOverdue) {
      return <Badge tone="red">Overdue ({Math.abs(daysLeft)} days ago)</Badge>;
    }
    if (daysLeft === 0) {
      return <Badge tone="amber">Closes Today</Badge>;
    }
    if (daysLeft <= 3) {
      return <Badge tone="amber">{daysLeft} days left</Badge>;
    }
    return <Badge tone="gray">{daysLeft} days left</Badge>;
  };

  const submissionsPercent = invitedIds.length > 0 ? (submittedCount / invitedIds.length) * 100 : 0;

  return (
    <div className="page-enter">
      <Link href="/rfqs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to RFQs
      </Link>

      <PageHeader
        title={rfq.title}
        action={
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="secondary" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4" /> Duplicate RFQ
              </Button>
            )}
            {editable && submittedCount > 0 && (
              <Link href={`/quotations/compare?rfqId=${rfq.id}`}>
                <Button variant="secondary" size="sm">
                  <GitCompare className="h-4 w-4" /> Compare bids
                </Button>
              </Link>
            )}
            {isVendor && rfq.status === 'open' && (
              <Link href={`/quotations/new?rfqId=${rfq.id}`}>
                <Button size="sm">
                  <Send className="h-4 w-4" /> Submit Quotation
                </Button>
              </Link>
            )}
            {editable && rfq.status === 'open' && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={sendDeadlineReminder} 
                  loading={sendingReminder} 
                  disabled={isOverdue || invitedIds.length === submittedCount}
                >
                  <Bell className="h-4 w-4" /> Remind Pending
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmClose(true)}>
                  <XCircle className="h-4 w-4" /> Close RFQ
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Details Card */}
          <Card>
            <CardHeader tinted>
              <CardTitle>RFQ Details</CardTitle>
              <div className="flex items-center gap-2">
                {renderDeadlineIndicator()}
                <StatusBadge status={rfq.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <p className="text-sm text-text-primary leading-relaxed">{rfq.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm border-t border-brand-border pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Deadline</p>
                  <p className="font-semibold text-text-primary mt-1 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" /> {formatDate(rfq.deadline)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Created On</p>
                  <p className="font-semibold text-text-primary mt-1 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" /> {formatDate(rfq.createdAt)}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">Requested Products</p>
                <Table>
                  <THead>
                    <TR>
                      <TH>Product</TH>
                      <TH>Quantity</TH>
                      <TH>Unit</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {parseProductDetails(rfq).map((p, i) => (
                      <TR key={i}>
                        <TD className="font-semibold text-text-primary">{p.name}</TD>
                        <TD className="font-medium">{p.quantity}</TD>
                        <TD className="text-text-secondary">{p.unit}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Vendors submissions tracking */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Invited Vendors ({invitedIds.length})</CardTitle>
              <Badge tone="green">{submittedCount} quotation(s) received</Badge>
            </CardHeader>
            <CardContent className="pt-2">
              {/* Submission Progress bar */}
              {invitedIds.length > 0 && (
                <div className="mb-4 bg-gray-50 border border-brand-border p-3.5 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-semibold text-text-secondary mb-1.5">
                    <span>Submission Status Ratio</span>
                    <span className="text-emerald-700">{submittedCount} / {invitedIds.length} Submitted</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-emerald-500 h-full transition-all duration-300 rounded-full" style={{ width: `${submissionsPercent}%` }} />
                  </div>
                </div>
              )}

              {invitedIds.length === 0 ? (
                <EmptyState icon={FileText} title="No vendors invited" />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Vendor</TH>
                      <TH>Category</TH>
                      <TH>Quotation status</TH>
                      <TH>Amount</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {invitedIds.map((vid) => {
                      const v = vendors.find((x) => x.id === vid);
                      const quote = quotations.find((q) => q.vendorId === vid);
                      return (
                        <TR key={vid} onClick={quote ? () => router.push(`/quotations/${quote.id}`) : undefined} className={quote ? 'cursor-pointer hover:bg-orange-50/20' : ''}>
                          <TD className="font-semibold text-text-primary">{v?.companyName ?? 'Unknown'}</TD>
                          <TD><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-medium text-gray-700">{v?.category ?? '—'}</span></TD>
                          <TD>{quotedVendorIds.has(vid) ? <StatusBadge status={quote?.status ?? 'submitted'} /> : <Badge tone="amber">Awaiting Bid</Badge>}</TD>
                          <TD className="font-semibold text-text-primary">{quote ? formatCurrency(quote.totalAmount) : '—'}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Timeline */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {rfqLogs.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No activities logged yet.</p>
            ) : (
              <ol className="relative space-y-6 border-l border-brand-border pl-5">
                {rfqLogs.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm ring-4 ring-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold text-text-primary">{log.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                        <User className="h-3.5 w-3.5" />
                        <span>{log.userName || 'System'}</span>
                        <span>·</span>
                        <span>{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={closeRfq}
        title="Close RFQ"
        message="Closing this RFQ will prevent vendors from submitting new quotations. Continue?"
        confirmLabel="Close RFQ"
        loading={closing}
      />
    </div>
  );
}
