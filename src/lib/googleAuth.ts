import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export type GoogleSignInResult = 'dashboard' | 'complete-profile' | 'quotations';

/**
 * Sign in with a Google popup, then decide where to route:
 * - existing Firestore profile  → 'dashboard' or 'quotations' (if vendor)
 * - first-time Google sign-in    → 'complete-profile'
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const cred = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (snap.exists()) {
    return snap.data().role === 'vendor' ? 'quotations' : 'dashboard';
  }
  return 'complete-profile';
}
