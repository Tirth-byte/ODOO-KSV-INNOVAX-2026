import { create } from 'zustand';
import type { AppUser } from '@/lib/types';

/** Minimal identity captured from a provider (e.g. Google) before the user
 *  has completed their VendorBridge profile. */
export interface PendingProfile {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  /** True when an authenticated Firebase user has no Firestore profile yet. */
  needsProfileCompletion: boolean;
  pendingProfile: PendingProfile | null;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsProfileCompletion: (value: boolean) => void;
  setPendingProfile: (profile: PendingProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  needsProfileCompletion: false,
  pendingProfile: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setNeedsProfileCompletion: (needsProfileCompletion) => set({ needsProfileCompletion }),
  setPendingProfile: (pendingProfile) => set({ pendingProfile }),
}));
