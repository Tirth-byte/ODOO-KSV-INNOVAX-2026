import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150',
  {
    variants: {
      variant: {
        primary:
          'rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm hover:from-orange-500 hover:to-orange-600 hover:shadow-lg hover:shadow-orange-200',
        secondary:
          'rounded-lg border border-brand-border bg-white text-text-primary hover:bg-orange-50',
        ghost: 'rounded-lg text-text-secondary hover:bg-orange-50 hover:text-text-primary',
        danger: 'rounded-lg bg-danger text-white hover:bg-red-600',
        success: 'rounded-lg bg-success text-white hover:bg-emerald-600',
        outline:
          'rounded-full border border-primary text-primary hover:bg-orange-50',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
