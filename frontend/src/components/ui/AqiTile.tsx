import { cn } from '../../lib/cn';
import type { AqiCategory } from '../../types/api';

export interface AqiTileProps {
  aqi: number;
  category: AqiCategory;
  city?: string;
  className?: string;
}

export function AqiTile({ aqi, category, city, className }: AqiTileProps) {
  const gradients: Record<AqiCategory, string> = {
    good: 'from-[#10B981] to-[#059669]',
    moderate: 'from-[#F59E0B] to-[#D97706]',
    unhealthySensitive: 'from-[#F97316] to-[#EA580C]',
    veryUnhealthy: 'from-[#EF4444] to-[#DC2626]',
    hazardous: 'from-[#9333EA] to-[#7E22CE]',
  };

  const labels: Record<AqiCategory, string> = {
    good: 'Good',
    moderate: 'Moderate',
    unhealthySensitive: 'Unhealthy (SG)',
    veryUnhealthy: 'Very Unhealthy',
    hazardous: 'Hazardous',
  };

  return (
    <div
      className={cn(
        'rounded-card p-5 bg-gradient-to-br text-white shadow-card flex flex-col justify-between h-[140px] min-w-[150px]',
        gradients[category],
        className
      )}
    >
      <div className="flex flex-col leading-none">
        {city ? <span className="font-sans text-[13px] font-semibold text-white/90">{city}</span> : null}
        <span className="font-sans text-[11px] font-medium text-white/75 mt-0.5 uppercase tracking-wider">
          AQI Category
        </span>
      </div>
      <div className="flex flex-col mt-auto leading-none">
        <span className="font-mono text-[40px] font-bold tracking-tight">{aqi}</span>
        <span className="font-sans text-[13px] font-semibold text-white/95 mt-1">
          {labels[category]}
        </span>
      </div>
    </div>
  );
}
