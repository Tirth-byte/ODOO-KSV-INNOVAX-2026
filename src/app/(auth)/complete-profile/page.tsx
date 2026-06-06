'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { completeProfileSchema, type CompleteProfileInput } from '@/lib/schemas';
import { Input, Label, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Misc';
import { toast } from '@/components/ui/Toast';
import { LogoFull, LogoIcon } from '@/components/ui/Logo';
import { COUNTRIES, ROLE_LABELS } from '@/lib/constants';
import type { UserRole } from '@/lib/types';

export default function CompleteProfilePage() {
  const router = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const pending = useAuthStore((s) => s.pendingProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const setNeedsProfileCompletion = useAuthStore((s) => s.setNeedsProfileCompletion);
  const setPendingProfile = useAuthStore((s) => s.setPendingProfile);

  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { role: 'procurement_officer', country: 'India' },
  });

  // Route away if the profile is already complete or the user isn't signed in.
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.role === 'vendor' ? '/quotations' : '/dashboard');
    } else if (!pending) {
      router.replace('/login');
    }
  }, [loading, user, pending, router]);

  if (loading || !pending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center page-enter">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  async function onSubmit(data: CompleteProfileInput) {
    if (!pending) return;
    setSubmitting(true);
    try {
      const profile = {
        email: pending.email,
        fullName: pending.fullName,
        role: data.role,
        phone: data.phone,
        country: data.country,
        avatarUrl: pending.avatarUrl ?? '',
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', pending.uid), profile);
      setUser({ id: pending.uid, ...profile, createdAt: null });
      setNeedsProfileCompletion(false);
      setPendingProfile(null);
      toast.success('Profile completed!');
      router.replace(data.role === 'vendor' ? '/quotations' : '/dashboard');
    } catch {
      toast.error('Could not save your profile. Please try again.');
      setSubmitting(false);
    }
  }

  const roles: UserRole[] = ['admin', 'manager', 'procurement_officer', 'vendor'];

  return (
    <div className="page-enter flex flex-col items-center">
      <div className="flex flex-col items-center mb-8">
        <LogoIcon size={52} />
        <div className="mt-3 text-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Vendor<span className="text-orange-500">Bridge</span>
          </h2>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-semibold mt-0.5">Enterprise Procurement</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-text-primary mt-6 text-center">Complete your profile</h2>
      <p className="mt-1 text-sm text-text-secondary text-center">Just a few details to finish setting up your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={pending.fullName} readOnly className="cursor-not-allowed bg-orange-50/40" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={pending.email} readOnly className="cursor-not-allowed bg-orange-50/40" />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" error={errors.role?.message} {...register('role')}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+1 555 000 1111" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Select id="country" error={errors.country?.message} {...register('country')}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Complete profile
        </Button>
      </form>
    </div>
  );
}
