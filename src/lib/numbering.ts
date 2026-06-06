import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Atomically increment a Firestore counter and return the next sequence value.
 * Used for PO-YYYY-XXXX and INV-YYYY-XXXX numbering.
 */
export async function nextSequence(counterId: string): Promise<number> {
  const ref = doc(db, 'counters', counterId);
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().value as number) : 0;
    const value = current + 1;
    tx.set(ref, { value }, { merge: true });
    return value;
  });
  return next;
}

export function formatPoNumber(seq: number, year = new Date().getFullYear()): string {
  return `PO-${year}-${String(seq).padStart(4, '0')}`;
}

export function formatInvoiceNumber(seq: number, year = new Date().getFullYear()): string {
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}
