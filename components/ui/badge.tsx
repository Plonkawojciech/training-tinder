import * as React from 'react';
import { cn, getSportColor } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  sport?: string;
  variant?: 'default' | 'outline' | 'muted';
}

export function Badge({ className, sport, variant = 'default', children, ...props }: BadgeProps) {
  if (sport) {
    const color = getSportColor(sport);
    return (
      <span
        className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full', className)}
        style={{
          color,
          background: `${color}18`,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }

  const variants = {
    default: 'bg-[#6366F1] text-white',
    outline: 'border border-[var(--border)] text-[var(--text-muted)]',
    muted: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
