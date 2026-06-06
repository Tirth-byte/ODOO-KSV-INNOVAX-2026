import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/formatCurrency';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tint = 'orange',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  tint?: 'orange' | 'green' | 'blue' | 'amber';
}) {
  const displayValue = typeof value === 'number' ? formatINR(value) : value;

  const tints = {
    orange: 'bg-orange-100 text-primary',
    green: 'bg-emerald-100 text-success',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-warning',
  };
  return (
    <Card className="p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tints[tint])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold text-text-primary">{displayValue}</p>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
            trend.up ? 'bg-emerald-50 text-success' : 'bg-red-50 text-danger'
          )}>
            {trend.up ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
          <span className="text-text-secondary">vs last month</span>
        </div>
      )}
    </Card>
  );
}
