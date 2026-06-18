import { PageHeader } from '../components/layout/PageHeader';
import { useMonitoringSummary, useMonitoringTimeseries, useMonitoringAlerts } from '../hooks/useMonitoring';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { KeyValueList } from '../components/ui/KeyValueList';
import { LineChartCard } from '../components/charts/LineChartCard';
import { TrendBadge } from '../components/ui/TrendBadge';
import { formatNumber, formatRelativeTime } from '../lib/format';
import type { Alert } from '../types/api';
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export default function MonitoringPage() {
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError, error: summaryError, refetch: refetchSummary } = useMonitoringSummary();
  const { data: throughputTimeseries, isLoading: isThroughputLoading, isError: isThroughputError, refetch: refetchThroughput } = useMonitoringTimeseries('throughput');
  const { data: latencyTimeseries, isLoading: isLatencyLoading, isError: isLatencyError, refetch: refetchLatency } = useMonitoringTimeseries('latency_p95');
  const { data: alerts, isLoading: isAlertsLoading, isError: isAlertsError, refetch: refetchAlerts } = useMonitoringAlerts();

  const handleRefresh = () => {
    refetchSummary();
    refetchThroughput();
    refetchLatency();
    refetchAlerts();
  };

  const isPageLoading = isSummaryLoading || isThroughputLoading || isLatencyLoading || isAlertsLoading;
  const isPageError = isSummaryError || isThroughputError || isLatencyError || isAlertsError;
  const pageError = summaryError;

  // 1. Loading skeletons matching UI tokens
  if (isPageLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Serving Monitoring"
          subtitle="Prometheus latency metrics and active alert tracking"
        />
        
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>

        {/* Bottom split sections */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="h-[280px] animate-pulse rounded-card border border-border bg-surface" />
            <div className="h-[280px] animate-pulse rounded-card border border-border bg-surface" />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="h-[300px] animate-pulse rounded-card border border-border bg-surface" />
            <div className="h-[200px] animate-pulse rounded-card border border-border bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error handling: display standard failure page if Prometheus service is offline
  if (isPageError || !summary || !throughputTimeseries || !latencyTimeseries || !alerts) {
    const errMsg = (pageError as any)?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Serving Monitoring"
          subtitle="Prometheus latency metrics and active alert tracking"
          action={
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Connection
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-card border border-danger/20 bg-danger-soft p-10 text-center shadow-card">
          <AlertCircle className="h-12 w-12 text-danger" />
          <h3 className="mt-4 text-card font-bold text-text">Monitoring Service Connection Failure</h3>
          <p className="mt-2 max-w-md text-body text-text-muted">
            {errMsg} Ensure the Prometheus HTTP API and FastAPI serving endpoint metrics exporter are running properly.
          </p>
        </div>
      </div>
    );
  }

  // Define columns for Alerts Table
  const alertColumns = [
    {
      key: 'severity',
      header: 'Severity',
      render: (a: Alert) => (
        <Badge status={a.severity === 'critical' ? 'danger' : 'warning'}>
          {a.severity}
        </Badge>
      ),
      className: 'w-[100px]',
    },
    {
      key: 'source',
      header: 'Alert Name',
      render: (a: Alert) => <span className="font-semibold text-text">{a.source}</span>,
      className: 'w-[140px]',
    },
    {
      key: 'message',
      header: 'Description',
      render: (a: Alert) => <span className="text-text-muted">{a.message}</span>,
    },
    {
      key: 'at',
      header: 'Active At',
      render: (a: Alert) => <span className="font-mono text-text-subtle text-[12px]">{formatRelativeTime(a.at)}</span>,
      className: 'w-[120px] text-right',
    },
  ];

  // Map service details list
  const serviceDetails = [
    { key: 'API Error Rate', value: `${(summary.errorRate * 100).toFixed(2)}%` },
    { key: 'Uptime (30d)', value: `${(summary.uptime30d * 100).toFixed(4)}%` },
    { key: 'Unresolved Incidents', value: String(summary.incidents30d) },
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Serving Monitoring"
        subtitle="Prometheus latency metrics and active alert tracking"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
                Open Grafana <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        }
      />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="THROUGHPUT"
          value={<span className="font-mono">{formatNumber(summary.requestsPerMin.value, 1)} req/min</span>}
          footer={
            <div className="flex items-center gap-1">
              <TrendBadge
                direction={summary.requestsPerMin.trend.direction}
                value={summary.requestsPerMin.trend.value}
                goodWhen="up"
              />
              <span className="text-text-muted">{summary.requestsPerMin.trend.label}</span>
            </div>
          }
        />
        <StatCard
          label="P50 LATENCY"
          value={<span className="font-mono">{summary.latency.p50} ms</span>}
          footer={<span className="text-text-muted">Median serving response time</span>}
        />
        <StatCard
          label="P95 / P99 LATENCY"
          value={<span className="font-mono">{summary.latency.p95} / {summary.latency.p99} ms</span>}
          footer={<span className="text-text-muted">Tail response latency percentiles</span>}
        />
      </div>

      {/* Main Split Panels */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Range metric line charts */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Throughput History
            </h2>
            <LineChartCard
              title="Throughput Trend"
              subtitle="FastAPI predictions call rate over the last 24 hours"
              data={throughputTimeseries}
              series={[
                { dataKey: 'value', name: 'Requests/min', color: '#0284C7' }
              ]}
              height={220}
            />
          </div>

          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Latency History
            </h2>
            <LineChartCard
              title="Tail Latency Trend (P95)"
              subtitle="P95 tail latency response times in milliseconds"
              data={latencyTimeseries}
              series={[
                { dataKey: 'value', name: 'P95 Latency (ms)', color: '#0D9488' }
              ]}
              height={220}
            />
          </div>
        </div>

        {/* Right column: Active alerts & Service health metrics */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Active Alerts
            </h2>
            {alerts.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 text-center shadow-card">
                <ShieldCheck className="h-9 w-9 text-success" />
                <h4 className="mt-3 font-sans text-[13px] font-semibold text-text">All Systems Operational</h4>
                <p className="mt-1 max-w-[200px] font-sans text-meta text-text-subtle">
                  No active Prometheus system alerts triggered.
                </p>
              </Card>
            ) : (
              <DataTable columns={alertColumns} data={alerts} />
            )}
          </div>

          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Service Details
            </h2>
            <Card>
              <KeyValueList items={serviceDetails} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
