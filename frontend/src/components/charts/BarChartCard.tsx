import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { CHART_COLORS } from './LineChartCard';

const AQI_COLORS = {
  good: '#10B981',
  moderate: '#F59E0B',
  unhealthySensitive: '#F97316',
  veryUnhealthy: '#EF4444',
  hazardous: '#9333EA',
};

export interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  xAxisKey?: string;
  colorMapKey?: string; // If provided, maps item[colorMapKey] to AQI_COLORS
  defaultColor?: string; // Fallback bar color (defaults to accent)
  footer?: ReactNode;
  height?: number;
  className?: string;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  dataKey,
  xAxisKey = 't',
  colorMapKey,
  defaultColor = '#0D9488', // --color-accent
  footer,
  height = 220,
  className,
}: BarChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans text-[14px] font-semibold text-text">{title}</h3>
          {subtitle ? <p className="font-sans text-[12px] text-text-muted">{subtitle}</p> : null}
        </div>
        {footer ? <div className="text-[12px]">{footer}</div> : null}
      </CardHeader>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={CHART_COLORS.axis}
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
              dx={-8}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'Inter',
                boxShadow: '0 4px 12px rgba(15,23,42,.08)',
              }}
              labelStyle={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}
            />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                let fill = defaultColor;
                if (colorMapKey && entry[colorMapKey]) {
                  const cat = entry[colorMapKey] as keyof typeof AQI_COLORS;
                  fill = AQI_COLORS[cat] || defaultColor;
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
