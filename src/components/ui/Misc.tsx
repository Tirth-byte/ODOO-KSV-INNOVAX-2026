'use client';

import { Star } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  active,
  className,
}: {
  name: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-orange-700',
        active && 'ring-2 ring-primary ring-offset-2',
        className,
      )}
    >
      {initials(name) || '?'}
    </div>
  );
}

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(rating) ? 'fill-warning text-warning' : 'text-gray-300'}
        />
      ))}
      <span className="ml-1 text-xs text-text-secondary">{rating.toFixed(1)}</span>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
