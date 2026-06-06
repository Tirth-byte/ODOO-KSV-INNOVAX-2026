import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-text-secondary">
      {children}
    </thead>
  );
}

export function TH({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <th colSpan={colSpan} className={cn('whitespace-nowrap px-4 py-3 font-medium', className)}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-brand-border">{children}</tbody>;
}

export function TR({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-100 hover:bg-orange-50/50',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className, colSpan, onClick }: { children?: React.ReactNode; className?: string; colSpan?: number; onClick?: (e: React.MouseEvent) => void }) {
  return <td colSpan={colSpan} onClick={onClick} className={cn('whitespace-nowrap px-4 py-3 text-text-primary', className)}>{children}</td>;
}
