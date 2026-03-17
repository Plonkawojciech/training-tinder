'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#6366F1] text-white hover:bg-[#6D28D9] active:scale-95 shadow-sm',
        outline: 'border border-[var(--border)] text-[var(--text)] bg-[var(--bg-card)] hover:border-[#6366F1] hover:text-[#6366F1] active:scale-95',
        ghost: 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)] active:scale-95',
        danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
        secondary: 'bg-[var(--bg-elevated)] text-[var(--text)] border border-[var(--border)] hover:border-[#6366F1] hover:text-[#6366F1] active:scale-95',
      },
      size: {
        sm: 'h-8 px-4 text-xs rounded-[10px]',
        default: 'h-11 px-6 rounded-[14px]',
        lg: 'h-13 px-8 text-base rounded-[16px]',
        icon: 'h-10 w-10 rounded-[12px]',
        'icon-sm': 'h-8 w-8 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
