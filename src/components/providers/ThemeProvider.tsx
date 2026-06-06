'use client';

import { useEffect } from 'react';

export const AVATAR_COLORS: { name: string; from: string; to: string }[] = [
  { name: 'Orange', from: '#fb923c', to: '#ea580c' },
  { name: 'Violet', from: '#a78bfa', to: '#7c3aed' },
  { name: 'Emerald', from: '#34d399', to: '#059669' },
  { name: 'Rose', from: '#fb7185', to: '#e11d48' },
  { name: 'Blue', from: '#60a5fa', to: '#2563eb' },
  { name: 'Amber', from: '#fbbf24', to: '#d97706' },
];

export function applyAvatarColor(from: string, to: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--avatar-from', from);
  document.documentElement.style.setProperty('--avatar-to', to);
  window.localStorage.setItem('vb_avatar', JSON.stringify({ from, to }));
}

/** Reads persisted avatar prefs and applies them before paint. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      // Always remove dark mode class
      document.documentElement.classList.remove('dark');
      const avatar = window.localStorage.getItem('vb_avatar');
      if (avatar) {
        const { from, to } = JSON.parse(avatar) as { from: string; to: string };
        document.documentElement.style.setProperty('--avatar-from', from);
        document.documentElement.style.setProperty('--avatar-to', to);
      }
    } catch {
      /* ignore corrupt prefs */
    }
  }, []);

  return <>{children}</>;
}
