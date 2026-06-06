import { NextResponse } from 'next/server';
import { nextSequence, formatPoNumber } from '@/lib/numbering';

export const runtime = 'nodejs';

/**
 * Returns the next PO number (PO-YYYY-XXXX). The primary flow numbers POs
 * client-side under the signed-in user's auth; this endpoint mirrors that
 * using the same atomic counter, with a timestamp fallback if the counter is
 * unreachable from the server context.
 */
export async function POST() {
  try {
    const seq = await nextSequence('po');
    return NextResponse.json({ poNumber: formatPoNumber(seq), sequence: seq });
  } catch {
    const fallback = Number(String(Date.now()).slice(-4));
    return NextResponse.json({ poNumber: formatPoNumber(fallback), sequence: fallback, fallback: true });
  }
}
