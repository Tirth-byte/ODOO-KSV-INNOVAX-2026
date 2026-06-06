'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import type { AppUser } from '@/lib/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setNeedsProfileCompletion = useAuthStore((s) => s.setNeedsProfileCompletion);
  const setPendingProfile = useAuthStore((s) => s.setPendingProfile);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setNeedsProfileCompletion(false);
        setPendingProfile(null);
        setLoading(false);
        return;
      }
      try {
        let snap = await getDoc(doc(db, 'users', fbUser.uid));
        // A just-registered email/password user may not have its Firestore doc
        // committed yet — retry once before treating the profile as missing.
        if (!snap.exists()) {
          await new Promise((r) => setTimeout(r, 700));
          snap = await getDoc(doc(db, 'users', fbUser.uid));
        }

        if (snap.exists()) {
          setUser({ id: fbUser.uid, ...(snap.data() as Omit<AppUser, 'id'>) });
          setNeedsProfileCompletion(false);
          setPendingProfile(null);
        } else {
          // Authenticated (e.g. via Google) but no VendorBridge profile yet.
          setUser(null);
          setPendingProfile({
            uid: fbUser.uid,
            email: fbUser.email ?? '',
            fullName: fbUser.displayName ?? fbUser.email ?? 'User',
            avatarUrl: fbUser.photoURL ?? undefined,
          });
          setNeedsProfileCompletion(true);
        }
      } catch {
        setUser(null);
        setNeedsProfileCompletion(false);
        setPendingProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [setUser, setLoading, setNeedsProfileCompletion, setPendingProfile]);

  return <>{children}</>;
}
