import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, footer, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col justify-between', className)}>
      <div>
        <p className="font-sans text-[12px] font-medium text-text-muted">{label}</p>
        <p className="mt-1.5 font-mono text-[28px] font-bold leading-tight tracking-tight text-text">
          {value}
        </p>
      </div>
      {footer ? (
        <div className="mt-2 flex items-center gap-1.5 font-sans text-[12px] text-text-muted">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
