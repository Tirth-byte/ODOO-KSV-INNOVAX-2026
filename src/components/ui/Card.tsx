import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('card hover:shadow-md transition-shadow duration-200', className)} {...props} />,
);
Card.displayName = 'Card';

export function CardHeader({
  className,
  tinted,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tinted?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-5 py-4',
        tinted ? 'rounded-t-2xl bg-primary-light/40' : 'border-b border-brand-border',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-text-primary', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
