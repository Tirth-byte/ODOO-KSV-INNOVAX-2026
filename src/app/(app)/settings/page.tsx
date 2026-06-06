'use client';

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, User as UserIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { initials, cn } from '@/lib/utils';
import { AVATAR_COLORS, applyAvatarColor } from '@/components/providers/ThemeProvider';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarIdx, setAvatarIdx] = useState(0);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    try {
      const a = window.localStorage.getItem('vb_avatar');
      if (a) {
        const { from } = JSON.parse(a) as { from: string };
        const i = AVATAR_COLORS.findIndex((c) => c.from === from);
        if (i >= 0) setAvatarIdx(i);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function saveProfile() {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { fullName: fullName.trim(), phone: phone.trim() });
      setUser({ ...user, fullName: fullName.trim(), phone: phone.trim() });
      toast.success('Profile updated.');
    } catch {
      toast.error('Could not update profile.');
    } finally {
      setSaving(false);
    }
  }



  function pickAvatar(i: number) {
    setAvatarIdx(i);
    applyAvatarColor(AVATAR_COLORS[i].from, AVATAR_COLORS[i].to);
    toast.success('Avatar colour updated.');
  }

  if (loading || !user) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl page-enter">
      <PageHeader title="Settings" subtitle="Manage your profile and preferences." />

      <div className="space-y-6">
        <Card>
          <CardHeader tinted>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ backgroundImage: `linear-gradient(to bottom right, ${AVATAR_COLORS[avatarIdx].from}, ${AVATAR_COLORS[avatarIdx].to})` }}
              >
                {initials(fullName || user.fullName) || '?'}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{user.fullName}</p>
                <p className="text-sm text-text-secondary">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} readOnly className="cursor-not-allowed opacity-70" />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} loading={saving}>
                <Check className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar colour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => pickAvatar(i)}
                  title={c.name}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white transition',
                    i === avatarIdx ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-105',
                  )}
                  style={{ backgroundImage: `linear-gradient(to bottom right, ${c.from}, ${c.to})` }}
                >
                  {i === avatarIdx ? <Check className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
