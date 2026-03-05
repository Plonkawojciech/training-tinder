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
        className={cn('inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider border', className)}
        style={{
          color,
          background: `${color}20`,
          borderColor: `${color}40`,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }

  const variants = {
    default: 'bg-[#FF4500] text-white border-transparent',
    outline: 'border border-[#2A2A2A] text-[#888888]',
    muted: 'bg-[#1A1A1A] text-[#888888] border-[#2A2A2A] border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
