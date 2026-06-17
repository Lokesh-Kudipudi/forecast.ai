import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold leading-tight text-text">{title}</h1>
        {subtitle ? <p className="text-body text-text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}
