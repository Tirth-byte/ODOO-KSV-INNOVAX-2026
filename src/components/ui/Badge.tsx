import { cn } from '@/lib/utils';

type Tone = 'gray' | 'orange' | 'green' | 'red' | 'blue' | 'amber';

const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
};

export function Badge({
  tone = 'gray',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  // vendor
  active: 'green',
  inactive: 'gray',
  pending: 'amber',
  // rfq
  draft: 'gray',
  open: 'blue',
  closed: 'gray',
  cancelled: 'red',
  // quotation / approval
  submitted: 'blue',
  accepted: 'green',
  approved: 'green',
  rejected: 'red',
  // PO
  confirmed: 'green',
  delivered: 'green',
  // invoice
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'gray';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge tone={tone}>{label}</Badge>;
}
