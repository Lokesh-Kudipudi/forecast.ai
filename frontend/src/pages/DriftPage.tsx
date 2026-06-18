import { PageHeader } from '../components/layout/PageHeader';
import { useDrift } from '../hooks/useDrift';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { DistributionChart } from '../components/charts/DistributionChart';
import { Link } from 'react-router-dom';
import { ROUTES } from '../router/routes';
import { formatNumber } from '../lib/format';
import {
  RefreshCw,
  Database,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Info,
  ChevronRight,
} from 'lucide-react';

function formatFeatureName(name: string): string {
  switch (name) {
    case 'temperature': return 'Temperature';
    case 'humidity': return 'Humidity';
    case 'wind_speed': return 'Wind Speed';
    case 'pm25_historical': return 'PM2.5 (Historical)';
    default: return name;
  }
}

export default function DriftPage() {
  const { data: driftData, isLoading, isError, error, refetch } = useDrift();

  const handleRefresh = () => {
    refetch();
  };

  // 1. Loading state with skeleton components matching design tokens
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Data Drift Analysis"
          subtitle="KS-test statistical drift metrics for serving features"
        />
        {/* Banner Skeleton */}
        <div className="mb-6 h-[88px] animate-pulse rounded-card border border-border bg-surface" />
        
        {/* Grid Skeletons */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="mt-8 h-[380px] animate-pulse rounded-card border border-border bg-surface" />
      </div>
    );
  }

  // 2. Handle case where database/logs are insufficient (200 OK with insufficientLogs flag)
  if (driftData?.insufficientLogs) {
    const errorMsg = driftData.detail || 'Insufficient live request logs to perform KS-test.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Data Drift Analysis"
          subtitle="KS-test statistical drift metrics for serving features"
          action={
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          }
        />
        <Card className="flex flex-col items-center justify-center p-10 shadow-card">
          <EmptyState
            icon={<Database className="h-6 w-6 text-text-muted" />}
            title="Insufficient Serving Logs"
            description={errorMsg}
            action={
              <Link to={ROUTES.forecasts}>
                <Button variant="primary" className="inline-flex items-center gap-1">
                  Go to Forecasts <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  // 3. Error handling (handles server/connection failures)
  if (isError || !driftData) {
    const axiosError = error as any;
    const errMsg = axiosError?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Data Drift Analysis"
          subtitle="KS-test statistical drift metrics for serving features"
          action={
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Connection
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-card border border-danger/20 bg-danger-soft p-10 text-center shadow-card">
          <AlertCircle className="h-12 w-12 text-danger" />
          <h3 className="mt-4 text-card font-bold text-text">Service Connection Failure</h3>
          <p className="mt-2 max-w-md text-body text-text-muted">
            {errMsg} Ensure the FastAPI service is running properly.
          </p>
        </div>
      </div>
    );
  }

  // 3. Zip baseline vs live arrays for Recharts AreaChart
  const trainingPoints = driftData.worst?.training || [];
  const livePoints = driftData.worst?.live || [];
  const chartData = trainingPoints.map((tp, idx) => {
    const lp = livePoints[idx];
    return {
      t: tp.t,
      training: tp.value,
      live: lp ? lp.value : 0,
    };
  });

  // 4. Determine alert banner status
  const getBannerDetails = () => {
    if (driftData.driftingCount > 0) {
      return {
        bgClass: 'bg-danger-soft border-danger/20',
        icon: <AlertCircle className="h-5 w-5 text-danger" />,
        badgeText: 'Drift Detected',
        badgeStatus: 'danger' as const,
        title: 'Critical: Significant Data Drift Detected',
        desc: `${driftData.driftingCount} of ${driftData.total} input feature distributions exhibit statistically significant drift (p-value < 0.05). Automated retraining is recommended to restore model accuracy.`,
      };
    }
    
    const hasBorderline = driftData.features.some((f) => f.verdict === 'borderline');
    if (hasBorderline) {
      return {
        bgClass: 'bg-warning-soft border-warning/20',
        icon: <AlertTriangle className="h-5 w-5 text-warning" />,
        badgeText: 'Borderline Drift',
        badgeStatus: 'warning' as const,
        title: 'Warning: Borderline Drift Observed',
        desc: 'No critical drift detected, but some feature distributions show minor deviation. Monitor incoming features and accuracy trends closely.',
      };
    }

    return {
      bgClass: 'bg-success-soft border-success/20',
      icon: <ShieldCheck className="h-5 w-5 text-success" />,
      badgeText: 'Healthy',
      badgeStatus: 'success' as const,
      title: 'Healthy: Serving Features Aligned',
      desc: 'All serving input features match their baseline training distributions. No data drift detected.',
    };
  };

  const banner = getBannerDetails();

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Data Drift Analysis"
        subtitle="KS-test statistical drift metrics for serving features"
        action={
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Data
          </Button>
        }
      />

      {/* Overview Banner */}
      <div className={`mb-8 flex flex-col items-start gap-4 rounded-card border p-5 shadow-card sm:flex-row sm:items-center ${banner.bgClass}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-surface shadow-sm">
          {banner.icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-sans text-[14px] font-bold text-text">{banner.title}</h4>
            <Badge status={banner.badgeStatus}>{banner.badgeText}</Badge>
          </div>
          <p className="mt-1 font-sans text-[13px] text-text-muted leading-relaxed">
            {banner.desc}
          </p>
        </div>
      </div>

      {/* Feature P-Value Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {driftData.features.map((feat) => {
          const badgeConfig = {
            ok: { status: 'success' as const, label: 'Healthy' },
            borderline: { status: 'warning' as const, label: 'Borderline' },
            drift: { status: 'danger' as const, label: 'Drifting' },
          };
          const cfg = badgeConfig[feat.verdict];

          return (
            <Card key={feat.feature} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[13px] font-semibold text-text-muted">
                    {formatFeatureName(feat.feature)}
                  </span>
                  <Badge status={cfg.status}>{cfg.label}</Badge>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-sans text-meta text-text-subtle">p-value</span>
                  <span className="font-mono text-[18px] font-bold text-text">
                    {formatNumber(feat.pValue, 3)}
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <ScoreBar value={feat.pValue} verdict={feat.verdict} />
                <span className="mt-2 block font-sans text-micro text-text-subtle">
                  {feat.verdict === 'ok' && 'Distribution matches training baseline'}
                  {feat.verdict === 'borderline' && 'Mild distribution skew detected'}
                  {feat.verdict === 'drift' && 'Significant distribution shift'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Worst Feature Overlap Chart */}
      {driftData.worst && (
        <div className="mt-8">
          <DistributionChart
            title={`Distribution Overlap Analysis: ${formatFeatureName(driftData.worst.feature)}`}
            subtitle="Comparing training baseline dataset vs. active serving request window (20 bins probability density)"
            data={chartData}
            height={260}
            footer={
              <div className="flex items-center gap-1.5 text-text-muted">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  A low p-value indicates that serving data has drifted significantly from training data, which can degrade forecasting model accuracy.
                </span>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
