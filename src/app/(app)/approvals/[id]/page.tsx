'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckSquare, CheckCircle2, XCircle, FileText, AlertTriangle, Clock, Share2 } from 'lucide-react';
import { fetchDoc, fetchCollection } from '@/lib/firestore';
import { approveAndCreatePO, rejectApproval } from '@/lib/workflow';
import { formatDate, formatDateTime, hoursSince, cn, toDate } from '@/lib/utils';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Approval, Quotation, RFQ, Vendor, AppUser } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Textarea, Label } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader, RatingStars } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/activity';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const canDecide = can(role, 'approve');

  const [approval, setApproval] = useState<Approval | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [acting, setActing] = useState(false);
  
  const [selectedForwardId, setSelectedForwardId] = useState('');
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await fetchDoc<Approval>('approvals', id);
      setApproval(a);
      if (a) {
        const q = await fetchDoc<Quotation>('quotations', a.quotationId);
        setQuotation(q);
        const [r, v, uList] = await Promise.all([
          fetchDoc<RFQ>('rfqs', a.rfqId),
          fetchDoc<Vendor>('vendors', a.vendorId ?? q?.vendorId ?? ''),
          fetchCollection<AppUser>('users'),
        ]);
        setRfq(r);
        setVendor(v);
        setUsers(uList.filter(u => u.role === 'admin' || u.role === 'manager'));
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleApprove() {
    if (!approval || !quotation || !user) return;
    setActing(true);
    try {
      const poId = await approveAndCreatePO(approval.id, quotation, user, remarks);
      toast.success('Approved — purchase order created.');
      router.push(`/purchase-orders/${poId}`);
    } catch {
      toast.error('Could not approve.');
      setActing(false);
    }
  }

  async function handleReject() {
    if (!approval || !quotation || !user) return;
    if (!remarks.trim()) {
      toast.error('Remarks are required when rejecting.');
      return;
    }
    setActing(true);
    try {
      await rejectApproval(approval.id, quotation, user, remarks);
      toast.success('Quotation rejected.');
      router.push('/approvals');
    } catch {
      toast.error('Could not reject.');
      setActing(false);
    }
  }

  async function handleForward() {
    if (!selectedForwardId || !approval || !user) return;
    setForwarding(true);
    try {
      const targetUser = users.find(u => u.id === selectedForwardId);
      if (!targetUser) return;
      
      await updateDoc(doc(db, 'approvals', approval.id), {
        approverId: selectedForwardId
      });
      
      await logActivity(
        user.id,
        'forwarded',
        'Approval',
        approval.id,
        `Forwarded approval request to ${targetUser.fullName}`,
        { targetUserId: selectedForwardId },
        user.fullName
      );
      
      await logActivity(
        'system',
        'notification',
        'Approval',
        approval.id,
        `Notification sent to approver`,
        undefined,
        'System'
      );
      
      toast.success(`Approval forwarded to ${targetUser.fullName}`);
      setApproval(prev => prev ? { ...prev, approverId: selectedForwardId } : null);
      setSelectedForwardId('');
    } catch (err) {
      toast.error('Failed to forward approval.');
    } finally {
      setForwarding(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!approval || !quotation) {
    return <EmptyState icon={CheckSquare} title="Approval not found" action={<Button onClick={() => router.push('/approvals')}>Back</Button>} />;
  }

  const subtotal = quotation.lineItems.reduce((s, it) => s + it.total, 0);
  const pending = approval.status === 'pending';

  // Escalation Check: Overdue (> 48 hours pending)
  const hours = hoursSince(approval.createdAt);
  const overdue = pending && hours !== null && hours > 48;

  return (
    <div className="page-enter">
      <Link href="/approvals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to approvals
      </Link>

      <PageHeader title="Approval Request" subtitle={rfq?.title} action={<StatusBadge status={approval.status} />} />

      {/* Escalation Warning Banner */}
      {overdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 animate-pulse">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Escalation Alert: Overdue Approval</h4>
            <p className="text-xs mt-1">
              This approval request has been pending for {hours !== null ? Math.round(hours) : 'more than 48'} hours. Please review and resolve this request immediately or forward it to another decision maker.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader tinted>
              <CardTitle>Quotation Summary</CardTitle>
              <Link href={`/quotations/${quotation.id}`} className="text-sm font-medium text-primary hover:underline">View full</Link>
            </CardHeader>
            <Table>
              <THead>
                <TR><TH>Description</TH><TH>Qty</TH><TH>Unit Price</TH><TH>Total</TH></TR>
              </THead>
              <TBody>
                {quotation.lineItems.map((it, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{it.description}</TD>
                    <TD>{it.qty}</TD>
                    <TD>{formatCurrency(it.unitPrice)}</TD>
                    <TD>{formatCurrency(it.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <CardContent>
              <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Tax ({quotation.taxRate ?? 0}%)</span><span>{formatCurrency(quotation.taxAmount ?? 0)}</span></div>
                <div className="flex justify-between border-t border-brand-border pt-2 text-base font-bold"><span>Total</span><span className="text-primary">{formatCurrency(quotation.totalAmount)}</span></div>
              </div>
            </CardContent>
          </Card>

          {pending && canDecide && (
            <Card>
              <CardHeader><CardTitle>Decision</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="remarks">Remarks <span className="text-text-secondary">(required to reject)</span></Label>
                  <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any remarks..." />
                </div>
                <div className="flex gap-3">
                  <Button variant="success" onClick={handleApprove} loading={acting}>
                    <CheckCircle2 className="h-4 w-4" /> Approve & Create PO
                  </Button>
                  <Button variant="danger" onClick={handleReject} disabled={acting}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>

                {/* Forward to Another Approver Option */}
                <div className="border-t border-brand-border pt-4 mt-4">
                  <Label htmlFor="forward-approver" className="text-xs font-semibold text-text-secondary uppercase">Forward to Another Approver</Label>
                  <div className="flex gap-2 mt-1.5">
                    <select
                      id="forward-approver"
                      value={selectedForwardId}
                      onChange={(e) => setSelectedForwardId(e.target.value)}
                      className="flex-1 rounded-md border border-brand-border bg-white px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">Select approver...</option>
                      {users
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={handleForward}
                      disabled={!selectedForwardId || forwarding}
                      loading={forwarding}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" /> Forward
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!pending && approval.remarks && (
            <Card>
              <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-text-primary">{approval.remarks}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Vendor</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-text-primary">{vendor?.companyName ?? '—'}</p>
              {vendor && <RatingStars rating={vendor.rating ?? 0} />}
              <p className="text-text-secondary">{vendor?.email}</p>
              <p className="text-text-secondary">{vendor?.category}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>RFQ</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium text-text-primary"><FileText className="h-4 w-4 text-primary" /> {rfq?.title ?? '—'}</p>
              <p className="text-text-secondary">Deadline: {formatDate(rfq?.deadline)}</p>
            </CardContent>
          </Card>

          {/* Stepper Timeline */}
          <Card>
            <CardHeader><CardTitle>Workflow Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  {/* Step 1: Requested */}
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute left-4 top-4 -ml-px h-full border-l-2 border-dashed border-emerald-500" aria-hidden="true" />
                      <div className="relative flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
                            <CheckSquare className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">Approval Requested</p>
                          <p className="text-xs text-gray-500">Initiated by Procurement Officer</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {formatDateTime(approval.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>

                  {/* Step 2: Under Review */}
                  <li>
                    <div className="relative pb-8">
                      <span className={cn("absolute left-4 top-4 -ml-px h-full border-l-2 border-dashed", !pending ? "border-emerald-500" : "border-gray-300")} aria-hidden="true" />
                      <div className="relative flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white text-white", 
                            !pending ? "bg-emerald-500" : overdue ? "bg-red-500" : "bg-amber-500"
                          )}>
                            <Clock className={cn("h-4 w-4", pending && "animate-pulse")} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">Under Review</p>
                          <p className="text-xs text-gray-500">
                            {approval.approverId 
                              ? `Assigned to ${users.find(u => u.id === approval.approverId)?.fullName ?? 'approver'}`
                              : 'Pending decision assignment'
                            }
                          </p>
                          {overdue && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 mt-1">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>

                  {/* Step 3: Resolution */}
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white text-white", 
                            pending ? "bg-gray-100 text-gray-400" : approval.status === 'approved' ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {!pending ? (
                              approval.status === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckSquare className="h-4 w-4 text-gray-300" />
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {pending ? 'Awaiting Decision' : approval.status === 'approved' ? 'Approved' : 'Rejected'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {pending ? 'Decision pending' : `Resolved by ${users.find(u => u.id === approval.approverId)?.fullName ?? 'approver'}`}
                          </p>
                          {!pending && approval.resolvedAt && (
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {formatDateTime(approval.resolvedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
