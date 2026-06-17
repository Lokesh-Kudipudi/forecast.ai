import { PageHeader } from '../components/layout/PageHeader';
import { useOverviewSummary } from '../hooks/useOverview';
import { StatCard } from '../components/ui/StatCard';
import { TrendBadge } from '../components/ui/TrendBadge';
import { StageChip } from '../components/ui/StageChip';
import { LineChartCard } from '../components/charts/LineChartCard';
import { DataTable } from '../components/ui/DataTable';
import { AqiTile } from '../components/ui/AqiTile';
import { Badge } from '../components/ui/Badge';
import { formatRelativeTime, formatNumber } from '../lib/format';
import type { DagSummary } from '../types/api';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function OverviewPage() {
  const { data, isLoading, isError, isFetching, error, refetch } = useOverviewSummary();

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="System Overview"
          subtitle="Health of the forecast.ai AQI pipeline"
        />
        {/* Skeleton loading grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-[320px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-2" />
          <div className="h-[320px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
        </div>
        <div className="mt-8">
          <div className="h-[200px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const errMsg = (error as any)?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="System Overview"
          subtitle="Health of the forecast.ai AQI pipeline"
          action={
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-body font-semibold text-text hover:bg-surface-muted transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Retry Connection
            </button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-card border border-danger/20 bg-danger-soft p-10 text-center shadow-card">
          <AlertCircle className="h-12 w-12 text-danger" />
          <h3 className="mt-4 text-card font-bold text-text">Service Connection Failure</h3>
          <p className="mt-2 max-w-md text-body text-text-muted">
            {errMsg} Ensure the FastAPI service is running at <code className="font-mono text-danger font-semibold bg-danger-soft/60 px-1 rounded">localhost:8000</code>.
          </p>
        </div>
      </div>
    );
  }

  // Map stats for Recharts LineChartCard
  const chartData = data.forecastVsActual.forecast.map((pt, index) => {
    const actualPoint = data.forecastVsActual.actual[index];
    return {
      t: pt.t,
      forecast: pt.value,
      actual: actualPoint ? actualPoint.value : null,
    };
  });

  const chartSeries = [
    { dataKey: 'forecast', name: 'Forecast AQI', color: '#0284C7' },
    { dataKey: 'actual', name: 'Actual AQI', color: '#0D9488' },
  ];

  // DAG status coloring helper
  const getDagStatusVariant = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'failed': return 'danger';
      case 'running': return 'info';
      default: return 'neutral';
    }
  };

  const dagColumns = [
    {
      key: 'dag',
      header: 'DAG Pipeline',
      render: (item: DagSummary) => (
        <span className="font-sans font-semibold text-text">{item.dag}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[100px]',
      render: (item: DagSummary) => (
        <Badge status={getDagStatusVariant(item.status)}>{item.status}</Badge>
      ),
    },
    {
      key: 'avgDurationSeconds',
      header: 'Avg Duration',
      className: 'w-[110px]',
      render: (item: DagSummary) => (
        <span className="font-mono text-text-muted">{item.avgDurationSeconds}s</span>
      ),
    },
    {
      key: 'successRate',
      header: 'Success Rate',
      className: 'w-[110px]',
      render: (item: DagSummary) => (
        <span className="font-mono text-text-muted">{(item.successRate * 100).toFixed(0)}%</span>
      ),
    },
    {
      key: 'lastRun',
      header: 'Last Run',
      render: (item: DagSummary) => (
        <span className="text-text-muted">{formatRelativeTime(item.lastRun)}</span>
      ),
    },
  ];

  const worstDriftFeature = data.drift.worstFeature;
  const isDrifting = data.drift.driftingCount > 0;

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="System Overview"
        subtitle="Health of the forecast.ai AQI pipeline"
        action={
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-body font-semibold text-text hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Production Model"
          value={`v${data.productionModel.version}`}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <StageChip stage={data.productionModel.stage} />
              <span className="font-mono text-[11px] text-text-muted">{data.productionModel.algorithm}</span>
            </div>
          }
        />
        <StatCard
          label="Validation RMSE"
          value={formatNumber(data.validationRmse.value, 2)}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendBadge
                direction={data.validationRmse.trend.direction}
                value={formatNumber(data.validationRmse.trend.value, 2)}
                goodWhen="down"
              />
              <span className="text-text-muted">{data.validationRmse.trend.label}</span>
            </div>
          }
        />
        <StatCard
          label="Serving Latency (P95)"
          value={`${formatNumber(data.latencyP95Ms.value, 1)} ms`}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendBadge
                direction={data.latencyP95Ms.trend.direction}
                value={`${formatNumber(data.latencyP95Ms.trend.value, 1)} ms`}
                goodWhen="down"
              />
              <span className="text-text-muted">vs last 24h</span>
            </div>
          }
        />
        <StatCard
          label="Feature Drift Summary"
          value={`${data.drift.driftingCount} / ${data.drift.total}`}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={isDrifting ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                {isDrifting ? 'Drift Detected' : 'No Drift'}
              </span>
              {worstDriftFeature && (
                <span className="text-text-subtle text-[11px]">
                  (Worst: <code className="font-mono text-[10px] bg-surface-muted px-1 py-0.5 rounded">{worstDriftFeature}</code>)
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Charts & Pipelines Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LineChartCard
          title="Forecast vs Actual AQI"
          subtitle="Comparing 24-hour predictions with live telemetry values"
          data={chartData}
          series={chartSeries}
          className="lg:col-span-2"
          footer={
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-text-muted">
                Validation RMSE: <strong className="font-mono text-text">{formatNumber(data.forecastVsActual.rmse, 2)}</strong>
              </span>
            </div>
          }
        />

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-5 shadow-card h-full flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-sans text-[14px] font-semibold text-text">Orchestration & DAGs</h3>
              <p className="font-sans text-[12px] text-text-muted">System scheduling operational health status</p>
            </div>
            <div className="flex-grow">
              <DataTable
                columns={dagColumns}
                data={data.dagHealth}
                className="border-none shadow-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tracked Cities Grid Section */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-sans text-[14px] font-semibold text-text">Tracked Cities Snapshots</h3>
            <p className="font-sans text-[12px] text-text-muted">Live Air Quality Index snapshots from default monitoring cities</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {data.citySnapshot.map((city) => (
            <AqiTile
              key={city.city}
              city={city.city}
              aqi={city.aqi}
              category={city.category}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
