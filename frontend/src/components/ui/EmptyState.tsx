import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 px-6 text-center', className)}>
      <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-surface-muted text-text-muted shadow-inner">
        {icon}
      </div>
      <h3 className="font-sans text-[14px] font-semibold text-text-muted">{title}</h3>
      <p className="mt-1.5 max-w-[280px] font-sans text-[13px] text-text-subtle leading-normal">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
