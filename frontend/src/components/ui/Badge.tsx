import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { StatusLevel } from '../../types/api';
import { StatusDot } from './StatusDot';

export interface BadgeProps {
  status: StatusLevel;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
}

export function Badge({ status, children, showDot = false, className }: BadgeProps) {
  const styles: Record<StatusLevel, string> = {
    success: 'bg-success-soft text-[#047857]',
    warning: 'bg-warning-soft text-[#B45309]',
    danger: 'bg-danger-soft text-[#B91C1C]',
    info: 'bg-info-soft text-primary-hover',
    neutral: 'bg-surface-muted text-text-muted',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] rounded-pill px-[9px] py-[3px] font-sans text-micro font-semibold shadow-sm leading-none',
        styles[status],
        className
      )}
    >
      {showDot ? <StatusDot status={status} /> : null}
      {children}
    </span>
  );
}
