import { cn } from '../../lib/cn';
import type { StatusLevel } from '../../types/api';

export interface StatusDotProps {
  status: StatusLevel | 'idle';
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const bgClasses: Record<StatusLevel | 'idle', string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    neutral: 'bg-text-subtle',
    idle: 'bg-text-subtle',
  };

  return (
    <span
      className={cn(
        'inline-block h-[7px] w-[7px] rounded-pill shrink-0',
        bgClasses[status],
        className
      )}
      aria-hidden="true"
    />
  );
}
