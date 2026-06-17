import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full bg-surface border border-border-strong rounded-md px-3 py-[9px] font-sans text-[13px] text-text placeholder:text-text-subtle outline-none transition-all focus:border-primary focus:ring-3 focus:ring-primary-soft',
        className
      )}
      {...props}
    />
  );
}
