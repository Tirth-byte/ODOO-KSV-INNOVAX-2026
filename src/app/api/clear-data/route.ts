import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const collections = ['vendors', 'rfqs', 'quotations', 'approvals', 'purchaseOrders', 'invoices', 'activityLogs'];
    let totalDeleted = 0;

    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) continue;

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      totalDeleted += snapshot.size;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} documents from all collections`,
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
