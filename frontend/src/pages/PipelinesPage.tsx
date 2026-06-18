import { PageHeader } from '../components/layout/PageHeader';
import { usePipelinesDags, usePipelinesRuns, useDvcVersions } from '../hooks/usePipelines';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { BarChartCard } from '../components/charts/BarChartCard';
import { StatusDot } from '../components/ui/StatusDot';
import { formatRelativeTime, formatNumber } from '../lib/format';
import type { DagRun, DvcVersion, StatusLevel, DagStatus } from '../types/api';
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Calendar,
  Clock,
  Activity,
} from 'lucide-react';

function mapDagStatusToStatusLevel(status: DagStatus): StatusLevel {
  switch (status) {
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'failed': return 'danger';
    case 'running': return 'info';
    default: return 'neutral';
  }
}

function formatDagName(id: string): string {
  switch (id) {
    case 'hourly_ingestion': return 'Hourly Weather Ingestion';
    case 'weekly_retraining': return 'Weekly ML Retraining';
    case 'drift_check': return 'Data Drift Check';
    case 'dvc_push': return 'DVC Dataset Push';
    default: return id;
  }
}

export default function PipelinesPage() {
  const { data: dags, isLoading: isDagsLoading, isError: isDagsError, error: dagsError, refetch: refetchDags } = usePipelinesDags();
  const { data: runs, isLoading: isRunsLoading, isError: isRunsError, error: runsError, refetch: refetchRuns } = usePipelinesRuns();
  const { data: dvcVersions, isLoading: isDvcLoading, isError: isDvcError, error: dvcError, refetch: refetchDvc } = useDvcVersions();

  const handleRefresh = () => {
    refetchDags();
    refetchRuns();
    refetchDvc();
  };

  const isPageLoading = isDagsLoading || isRunsLoading || isDvcLoading;
  const isPageError = isDagsError || isRunsError || isDvcError;
  const pageError = dagsError || runsError || dvcError;

  // 1. Loading skeletons matching UI tokens
  if (isPageLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Orchestration Pipelines"
          subtitle="Apache Airflow DAG schedules and DVC dataset logs"
        />
        
        {/* DAG Grid skeletons */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[130px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>

        {/* Bottom split sections */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-[400px] animate-pulse rounded-card border border-border bg-surface lg:col-span-2" />
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="h-[200px] animate-pulse rounded-card border border-border bg-surface" />
            <div className="h-[280px] animate-pulse rounded-card border border-border bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error handling: display standard failure page if DB or DVC services fail
  if (isPageError || !dags || !runs || !dvcVersions) {
    const errMsg = (pageError as any)?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Orchestration Pipelines"
          subtitle="Apache Airflow DAG schedules and DVC dataset logs"
          action={
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Connection
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-card border border-danger/20 bg-danger-soft p-10 text-center shadow-card">
          <AlertCircle className="h-12 w-12 text-danger" />
          <h3 className="mt-4 text-card font-bold text-text">Pipeline Service Connection Failure</h3>
          <p className="mt-2 max-w-md text-body text-text-muted">
            {errMsg} Ensure the Airflow Postgres metadata database and local repository are accessible.
          </p>
        </div>
      </div>
    );
  }

  // 3. Format dataset growth points for Recharts BarChart
  const chartData = [...dvcVersions].reverse().map((v) => ({
    t: v.hash,
    rows: v.rows,
  }));

  // Define columns for Runs Table
  const runColumns = [
    {
      key: 'runId',
      header: 'Run ID',
      render: (r: DagRun) => <span className="font-mono text-[12px] font-semibold text-text">{r.runId.slice(0, 16)}</span>,
    },
    {
      key: 'dag',
      header: 'Pipeline',
      render: (r: DagRun) => <span className="font-semibold text-text">{formatDagName(r.dag)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: DagRun) => <Badge status={mapDagStatusToStatusLevel(r.status)}>{r.status}</Badge>,
    },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (r: DagRun) => <span className="text-text-muted">{formatRelativeTime(r.startedAt)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (r: DagRun) => <span className="font-mono text-text-muted">{r.durationSeconds}s</span>,
    },
    {
      key: 'dvcVersion',
      header: 'Dataset Hash',
      render: (r: DagRun) => <span className="font-mono text-text-subtle">{r.dvcVersion}</span>,
    },
  ];

  // Define columns for DVC Versions Table
  const dvcColumns = [
    {
      key: 'hash',
      header: 'DVC Hash',
      render: (v: DvcVersion) => <span className="font-mono font-bold text-text-muted">{v.hash}</span>,
    },
    {
      key: 'rows',
      header: 'Dataset Size',
      render: (v: DvcVersion) => <span className="font-mono font-medium text-text">{formatNumber(v.rows)} rows</span>,
    },
    {
      key: 'pushedAt',
      header: 'Committed At',
      render: (v: DvcVersion) => <span className="text-text-muted">{new Date(v.pushedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
    },
    {
      key: 'remote',
      header: 'Remote',
      render: (v: DvcVersion) => <span className="font-sans text-[12px] font-semibold text-accent">{v.remote}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Orchestration Pipelines"
        subtitle="Apache Airflow DAG schedules and DVC dataset logs"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
            <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
                Open Airflow UI <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        }
      />

      {/* DAG Health Card Grid */}
      <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
        Pipeline Schedulers
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {dags.map((dag) => (
          <Card key={dag.dag} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] font-bold text-text">
                  {formatDagName(dag.dag)}
                </span>
                <StatusDot status={mapDagStatusToStatusLevel(dag.status)} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-text-subtle">
                <Calendar className="h-3.5 w-3.5" />
                <span>Cron: {dag.schedule}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-sans text-[12px] text-text-muted">
                <Clock className="h-3.5 w-3.5" />
                <span>Last run: {dag.lastRun !== '—' ? formatRelativeTime(dag.lastRun) : 'never'}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div className="flex flex-col">
                <span className="font-sans text-micro text-text-subtle">AVG DURATION</span>
                <span className="font-mono text-[12px] font-bold text-text">
                  {dag.avgDurationSeconds}s
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-sans text-micro text-text-subtle">SUCCESS RATE</span>
                <Badge status={dag.successRate >= 0.9 ? 'success' : 'warning'}>
                  {Math.round(dag.successRate * 100)}%
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Split Panels */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Recent workflow runs */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
            Recent Workflow Executions
          </h2>
          <DataTable columns={runColumns} data={runs} />
        </div>

        {/* Right column: DVC log and chart */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Dataset Revisions (DVC)
            </h2>
            <DataTable columns={dvcColumns} data={dvcVersions} />
          </div>

          <div>
            <h2 className="mb-4 font-sans text-micro font-semibold uppercase tracking-wider text-text-subtle">
              Dataset Growth History
            </h2>
            <BarChartCard
              title="Historical AQI Records"
              subtitle="Incremental weather row accumulation by dataset hash"
              data={chartData}
              dataKey="rows"
              xAxisKey="t"
              height={200}
              footer={
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>Updates tracked using Git metadata and local DVC hashes.</span>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
