import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { EntityType } from './types';

/**
 * Append an audit-trail entry. Logging never throws into the caller — a failed
 * log should not break the primary action.
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: EntityType,
  entityId: string,
  description: string,
  metadata?: Record<string, unknown>,
  userName?: string,
): Promise<void> {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      userId,
      userName: userName ?? null,
      action,
      entityType,
      entityId,
      description,
      metadata: metadata ?? null,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Swallow — audit logging is best-effort.
  }
}
