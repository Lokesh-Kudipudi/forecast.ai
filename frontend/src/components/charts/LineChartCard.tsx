import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';

export const CHART_COLORS = {
  primary: '#0284C7', // --color-primary
  accent: '#0D9488', // --color-accent
  grid: '#E2E8F0', // --color-border
  axis: '#94A3B8', // --color-text-subtle
};

export interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: Array<Record<string, any>>;
  xAxisKey?: string;
  series: ChartSeries[];
  footer?: ReactNode;
  height?: number;
  className?: string;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  xAxisKey = 't',
  series,
  footer,
  height = 220,
  className,
}: LineChartCardProps) {
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
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
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
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                fill={`url(#grad-${s.dataKey})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
