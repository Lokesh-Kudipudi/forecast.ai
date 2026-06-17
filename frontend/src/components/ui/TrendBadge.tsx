import { cn } from '../../lib/cn';

export interface TrendBadgeProps {
  direction: 'up' | 'down' | 'flat';
  value: string | number;
  goodWhen: 'up' | 'down';
  className?: string;
}

export function TrendBadge({ direction, value, goodWhen, className }: TrendBadgeProps) {
  const isGood =
    (direction === 'up' && goodWhen === 'up') ||
    (direction === 'down' && goodWhen === 'down');

  const colorClass =
    direction === 'flat'
      ? 'text-text-subtle'
      : isGood
      ? 'text-success'
      : 'text-danger';

  const glyph = {
    up: '▲',
    down: '▼',
    flat: '▬',
  }[direction];

  return (
    <span className={cn('inline-flex items-center gap-[3px] font-mono text-[12px] font-semibold', colorClass, className)}>
      <span>{glyph}</span>
      <span>{value}</span>
    </span>
  );
}
