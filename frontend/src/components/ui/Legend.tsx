import { cn } from '../../lib/cn';

export interface LegendItem {
  label: string;
  color: string; // CSS color string (e.g. hex or tailwind class)
  dashed?: boolean;
}

export interface LegendProps {
  items: LegendItem[];
  className?: string;
}

export function Legend({ items, className }: LegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[12px] text-text-muted', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.dashed ? (
            <div className="flex items-center gap-[2px]">
              <div className="h-[3px] w-[6px] rounded-[1px]" style={{ backgroundColor: item.color }} />
              <div className="h-[3px] w-[6px] rounded-[1px]" style={{ backgroundColor: item.color }} />
            </div>
          ) : (
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
