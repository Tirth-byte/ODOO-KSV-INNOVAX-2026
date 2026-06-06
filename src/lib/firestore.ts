import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

/** Map a Firestore snapshot doc into a typed object with its id. */
function withId<T>(id: string, data: DocumentData): T {
  return { id, ...data } as T;
}

export async function fetchCollection<T>(
  path: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const q = query(collection(db, path), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => withId<T>(d.id, d.data()));
}

export async function fetchDoc<T>(path: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? withId<T>(snap.id, snap.data()) : null;
}

export { collection, getDocs, query, orderBy, where, limit, doc, getDoc };
