import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-semibold rounded-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none leading-none shadow-sm';

  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-hover border border-transparent',
    secondary: 'bg-surface text-text border border-border-strong hover:bg-surface-muted',
    ghost: 'bg-transparent text-primary hover:bg-primary-soft border border-transparent shadow-none',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-[12px]',
    md: 'px-3.5 py-2 text-[13px]',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
