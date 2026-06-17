import { cn } from '../../lib/cn';

export interface ScoreBarProps {
  value: number; // Fraction between 0 and 1 (e.g. p-value)
  verdict: 'ok' | 'borderline' | 'drift';
  className?: string;
}

export function ScoreBar({ value, verdict, className }: ScoreBarProps) {
  const percentage = Math.min(100, Math.max(0, value * 100));

  const colors = {
    ok: 'bg-success',
    borderline: 'bg-warning',
    drift: 'bg-danger',
  };

  return (
    <div className={cn('h-[7px] w-full rounded-pill bg-surface-muted overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-pill transition-all duration-500', colors[verdict])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
