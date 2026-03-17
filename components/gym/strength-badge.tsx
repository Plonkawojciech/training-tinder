'use client';

interface StrengthBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#00CC44' },
  intermediate: { label: 'Intermediate', color: '#FFD700' },
  advanced: { label: 'Advanced', color: '#A78BFA' },
  elite: { label: 'Elite', color: '#6366F1' },
};

export function StrengthBadge({ level, size = 'md' }: StrengthBadgeProps) {
  const config = LEVEL_CONFIG[level] ?? { label: level, color: '#888888' };

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-block font-bold uppercase tracking-wider ${sizeClasses[size]}`}
      style={{
        color: config.color,
        background: `${config.color}20`,
        border: `1px solid ${config.color}60`,
      }}
    >
      {config.label}
    </span>
  );
}
