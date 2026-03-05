'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'bg-[#FF4500] text-white hover:shadow-[0_0_20px_rgba(255,69,0,0.4)] active:scale-95',
        outline: 'border border-[#2A2A2A] text-white hover:border-[#FF4500] hover:shadow-[0_0_15px_rgba(255,69,0,0.3)] active:scale-95',
        ghost: 'text-[#888888] hover:text-white hover:bg-[#1A1A1A] active:scale-95',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
        secondary: 'bg-[#1A1A1A] text-white border border-[#2A2A2A] hover:border-[#FF4500] active:scale-95',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-5',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
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
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
