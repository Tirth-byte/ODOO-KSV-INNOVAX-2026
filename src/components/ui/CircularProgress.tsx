import { cn } from '@/lib/utils';

export function CircularProgress({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Colour shifts with score: red → amber → green.
  const color = clamped >= 75 ? '#10B981' : clamped >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0E8E0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.4s' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-text-primary">{label ?? `${Math.round(clamped)}`}</span>
        {sublabel && <span className={cn('text-[11px] font-medium')} style={{ color }}>{sublabel}</span>}
      </div>
    </div>
  );
}
