import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className="relative inline-block w-full">
      <select
        className={cn(
          'w-full appearance-none bg-surface border border-border-strong rounded-md pl-3 pr-10 py-[9px] font-sans text-[13px] text-text outline-none transition-all focus:border-primary focus:ring-3 focus:ring-primary-soft cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
        <ChevronDown size={14} aria-hidden="true" />
      </div>
    </div>
  );
}
