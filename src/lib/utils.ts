import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { FireDate } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalise any Firestore-ish date value into a JS Date (or null). */
export function toDate(value: FireDate | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') return new Date(value);
  // Firestore Timestamp
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export function formatDate(value: FireDate | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value: FireDate | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Time-of-day greeting for the dashboard. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Days remaining until a deadline. Negative means overdue.
 * Returns null when there is no usable date.
 */
export function daysUntil(value: FireDate | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** Hours elapsed since a timestamp (used for approval escalation). */
export function hoursSince(value: FireDate | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  return (Date.now() - d.getTime()) / 3_600_000;
}

export function relativeTime(value: FireDate | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function parseProductDetails(rfq: any): any[] {
  if (!rfq) return [];
  const details = rfq.productDetails || rfq.product_details;
  if (!details) return [];
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(details) ? details : [];
}
