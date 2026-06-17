import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface KeyValueItem {
  key: string;
  value: ReactNode;
  className?: string;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  className?: string;
}

export function KeyValueList({ items, className }: KeyValueListProps) {
  return (
    <div className={cn('flex flex-col w-full', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center justify-between py-2 border-b border-dashed border-border last:border-b-0',
            item.className
          )}
        >
          <span className="font-sans text-[13px] font-medium text-text-muted">{item.key}</span>
          <span className="font-mono text-[13px] font-semibold text-text">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
