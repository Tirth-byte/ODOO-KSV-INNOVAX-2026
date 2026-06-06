import { NextResponse } from 'next/server';
import { nextSequence, formatInvoiceNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Returns the next invoice number (INV-YYYY-XXXX) using the shared atomic
 * counter, with a timestamp fallback if the counter is unreachable.
 */
export async function POST() {
  try {
    const seq = await nextSequence('invoice');
    return NextResponse.json({ invoiceNumber: formatInvoiceNumber(seq), sequence: seq });
  } catch {
    const fallback = Number(String(Date.now()).slice(-4));
    return NextResponse.json({ invoiceNumber: formatInvoiceNumber(fallback), sequence: fallback, fallback: true });
  }
}
