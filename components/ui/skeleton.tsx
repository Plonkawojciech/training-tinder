import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton animate-pulse rounded-[var(--radius-md)]', className)}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton animate-pulse h-4 rounded-full', className)}
    />
  );
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton animate-pulse rounded-full', className)}
    />
  );
}
