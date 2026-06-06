'use client';

import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable outside React components. */
export const toast = {
  success: (m: string) => useToastStore.getState().push(m, 'success'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
  info: (m: string) => useToastStore.getState().push(m, 'info'),
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};
const COLORS = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className="flex animate-slide-in items-start gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-md"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${COLORS[t.tone]}`} />
            <p className="flex-1 text-sm text-text-primary">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-text-secondary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
