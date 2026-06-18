import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full max-w-md transform overflow-hidden rounded-card border border-border bg-surface p-5 shadow-pop transition-all',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h3 className="text-[14px] font-semibold text-text">{title}</h3>
          <button
            type="button"
            className="rounded-sm p-1 text-text-subtle hover:bg-surface-muted hover:text-text transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="text-[13px] text-text-muted leading-relaxed mb-5">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-border pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
