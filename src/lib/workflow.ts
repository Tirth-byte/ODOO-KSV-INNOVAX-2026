import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';
import { nextSequence, formatPoNumber } from './numbering';
import type { Quotation, AppUser } from './types';

/**
 * Create a pending approval request for a quotation. Used both from the
 * quotation detail page and the comparison "Select & Approve" action.
 */
export async function initiateApproval(
  quotation: Quotation,
  user: AppUser,
): Promise<string> {
  const ref = await addDoc(collection(db, 'approvals'), {
    rfqId: quotation.rfqId,
    quotationId: quotation.id,
    vendorId: quotation.vendorId,
    amount: quotation.totalAmount,
    requestedBy: user.id,
    status: 'pending',
    remarks: '',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'quotations', quotation.id), { status: 'submitted' });
  await logActivity(
    user.id,
    'requested approval',
    'Approval',
    ref.id,
    `Requested approval for quotation ${quotation.id.slice(0, 6)}`,
    undefined,
    user.fullName,
  );
  await logActivity(
    'system',
    'notification',
    'Approval',
    ref.id,
    `Notification sent to approver`,
    undefined,
    'System'
  );
  return ref.id;
}

/**
 * Approve a quotation: mark approval + quotation accepted and auto-generate a
 * purchase order. Returns the new PO id.
 */
export async function approveAndCreatePO(
  approvalId: string,
  quotation: Quotation,
  user: AppUser,
  remarks: string,
): Promise<string> {
  const seq = await nextSequence('po');
  const poNumber = formatPoNumber(seq);

  const subtotal = quotation.lineItems.reduce((s, it) => s + it.total, 0);
  const taxRate = quotation.taxRate ?? 0;
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  const poRef = await addDoc(collection(db, 'purchaseOrders'), {
    poNumber,
    quotationId: quotation.id,
    rfqId: quotation.rfqId,
    vendorId: quotation.vendorId,
    lineItems: quotation.lineItems,
    subtotal,
    taxRate,
    taxAmount,
    grandTotal,
    status: 'confirmed',
    poDate: serverTimestamp(),
    createdBy: user.id,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'approvals', approvalId), {
    status: 'approved',
    approverId: user.id,
    remarks,
    resolvedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'quotations', quotation.id), { status: 'accepted' });

  await logActivity(user.id, 'approved', 'Approval', approvalId, `Approved quotation — generated ${poNumber}`, { poNumber }, user.fullName);
  await logActivity(user.id, 'created', 'PO', poRef.id, `Created purchase order ${poNumber}`, { poNumber }, user.fullName);

  return poRef.id;
}

export async function rejectApproval(
  approvalId: string,
  quotation: Quotation,
  user: AppUser,
  remarks: string,
): Promise<void> {
  await updateDoc(doc(db, 'approvals', approvalId), {
    status: 'rejected',
    approverId: user.id,
    remarks,
    resolvedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'quotations', quotation.id), { status: 'rejected' });
  await logActivity(user.id, 'rejected', 'Approval', approvalId, `Rejected quotation ${quotation.id.slice(0, 6)}`, { remarks }, user.fullName);
}
