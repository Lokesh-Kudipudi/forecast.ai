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
import { CHART_COLORS } from './LineChartCard';

export interface DistributionChartProps {
  title: string;
  subtitle?: string;
  data: Array<{ t: string; training: number; live: number }>;
  footer?: ReactNode;
  height?: number;
  className?: string;
}

export function DistributionChart({
  title,
  subtitle,
  data,
  footer,
  height = 220,
  className,
}: DistributionChartProps) {
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
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-training" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-live" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="t"
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
            <Area
              type="monotone"
              dataKey="training"
              name="Training Dist"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#grad-training)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="live"
              name="Live Serving Dist"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              fill="url(#grad-live)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
