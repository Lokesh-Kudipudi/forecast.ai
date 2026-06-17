import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5 shadow-card', className)}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}
