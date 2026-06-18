import { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useRuns, useRunDetail } from '../hooks/useRuns';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { KeyValueList } from '../components/ui/KeyValueList';
import { LineChartCard } from '../components/charts/LineChartCard';
import { Button } from '../components/ui/Button';
import { formatRelativeTime, formatNumber } from '../lib/format';
import type { TrainingRun } from '../types/api';
import { RefreshCw, AlertCircle, Calendar, ShieldCheck, Database, Info, FileText } from 'lucide-react';

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const { data: runs, isLoading: isRunsLoading, isError: isRunsError, isFetching: isRunsFetching, error: runsError, refetch: refetchRuns } = useRuns(statusFilter);
  const { data: runDetail, isLoading: isDetailLoading, isError: isDetailError, refetch: refetchDetail } = useRunDetail(selectedRunId);

  // Default select first run when runs list loads
  useEffect(() => {
    if (runs && runs.length > 0) {
      const exists = runs.some((r) => r.runId === selectedRunId);
      const firstRun = runs[0];
      if (!selectedRunId || !exists) {
        if (firstRun) {
          setSelectedRunId(firstRun.runId);
        }
      }
    } else {
      setSelectedRunId('');
    }
  }, [runs, selectedRunId]);

  const handleRefresh = () => {
    refetchRuns();
    if (selectedRunId) {
      refetchDetail();
    }
  };

  if (isRunsLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Training Runs"
          subtitle="Observe baseline-vs-improved model metrics"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-[450px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-2" />
          <div className="h-[450px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-1" />
        </div>
      </div>
    );
  }

  if (isRunsError || !runs) {
    const errMsg = (runsError as any)?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Training Runs"
          subtitle="Observe baseline-vs-improved model metrics"
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
            {errMsg} Ensure the FastAPI service and MLflow server are running properly.
          </p>
        </div>
      </div>
    );
  }

  const finishedRuns = runs.filter((r) => r.status === 'finished');
  const avgValRmse = finishedRuns.length > 0
    ? finishedRuns.reduce((acc, curr) => acc + (curr.improvedRmse || 0), 0) / finishedRuns.length
    : 0;
  
  const successRate = runs.length > 0
    ? (finishedRuns.length / runs.length) * 100
    : 0;

  const chartData = [...runs].reverse().map((r) => ({
    t: new Date(r.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
    baseline: r.baselineRmse,
    improved: r.improvedRmse !== null ? r.improvedRmse : null,
  }));

  const chartSeries = [
    { dataKey: 'baseline', name: 'Baseline RMSE (Linear Regression)', color: '#94A3B8', dashed: true },
    { dataKey: 'improved', name: 'Candidate RMSE (Random Forest)', color: '#0284C7' },
  ];

  const runsColumns = [
    {
      key: 'runId',
      header: 'Run ID',
      className: 'w-[120px]',
      render: (item: TrainingRun) => (
        <span className="font-mono font-semibold text-text text-[12px]">{item.runId.substring(0, 15)}</span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (item: TrainingRun) => (
        <span className="text-text-muted">{formatRelativeTime(item.startedAt)}</span>
      ),
    },
    {
      key: 'params',
      header: 'Hyperparameters',
      render: (item: TrainingRun) => (
        <span className="font-mono text-xs text-text-muted">
          est: {item.nEstimators}, depth: {item.maxDepth}
        </span>
      ),
    },
    {
      key: 'baselineRmse',
      header: 'Baseline RMSE',
      className: 'w-[110px]',
      render: (item: TrainingRun) => (
        <span className="font-mono text-text-muted">{formatNumber(item.baselineRmse, 2)}</span>
      ),
    },
    {
      key: 'improvedRmse',
      header: 'Improved RMSE',
      className: 'w-[110px]',
      render: (item: TrainingRun) => (
        <span className="font-mono font-bold text-text">
          {item.improvedRmse !== null ? formatNumber(item.improvedRmse, 2) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[100px]',
      render: (item: TrainingRun) => (
        <Badge status={item.status === 'finished' ? 'success' : 'danger'}>
          {item.status}
        </Badge>
      ),
    },
  ];

  const detailItems = runDetail ? [
    { key: 'Started At', value: new Date(runDetail.startedAt).toLocaleString() },
    { key: 'Algorithm', value: 'RandomForest' },
    { key: 'n_estimators', value: runDetail.nEstimators },
    { key: 'max_depth', value: runDetail.maxDepth },
    { key: 'Baseline RMSE', value: formatNumber(runDetail.baselineRmse, 4) },
    { key: 'Candidate RMSE', value: runDetail.improvedRmse !== null ? formatNumber(runDetail.improvedRmse, 4) : '—' },
    { key: 'MAE', value: runDetail.mae !== null ? formatNumber(runDetail.mae, 4) : '—' },
    { key: 'DVC Version', value: <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-text border border-border-strong">{runDetail.dvcVersion}</code> },
    { key: 'Registered Version', value: runDetail.registeredVersion ? `v${runDetail.registeredVersion}` : 'Not promoted' },
    { key: 'Artifact URI', value: <span className="text-[11px] font-mono break-all text-text-muted block max-w-[180px] text-right" title={runDetail.artifactPath}>{runDetail.artifactPath.length > 20 ? '...' + runDetail.artifactPath.substring(runDetail.artifactPath.length - 20) : runDetail.artifactPath}</span> },
  ] : [];

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Training Runs"
        subtitle="Observe baseline-vs-improved model metrics"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRunsFetching}
          >
            <RefreshCw className={isRunsFetching ? 'mr-1.5 h-3.5 w-3.5 animate-spin' : 'mr-1.5 h-3.5 w-3.5'} />
            {isRunsFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Training Executions"
          value={runs.length}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar size={14} className="text-text-subtle" />
              <span className="text-text-muted">
                Last run: <strong className="text-text">{runs[0] ? formatRelativeTime(runs[0].startedAt) : '—'}</strong>
              </span>
            </div>
          }
        />
        <StatCard
          label="Avg Candidate RMSE"
          value={avgValRmse > 0 ? formatNumber(avgValRmse, 2) : '—'}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-text-muted">Based on all finished runs</span>
            </div>
          }
        />
        <StatCard
          label="Retraining Success Rate"
          value={`${formatNumber(successRate, 0)}%`}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <Database size={14} className="text-text-subtle" />
              <span className="text-text-muted">
                {finishedRuns.length} successes / {runs.length} runs
              </span>
            </div>
          }
        />
      </div>

      {/* Filter and Content Grid */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-body font-semibold text-text-muted">Filter by Status:</span>
            <div className="w-[160px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="all">All Runs</option>
                <option value="finished">Finished</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main content: Chart + Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trend Chart */}
            {runs.length > 0 ? (
              <LineChartCard
                title="Model Performance Evolution"
                subtitle="RMSE evaluation of weekly retraining candidates against the Linear Regression baseline"
                data={chartData}
                series={chartSeries}
              />
            ) : null}

            {/* Runs Table */}
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <div className="mb-4">
                <h3 className="font-sans text-[14px] font-semibold text-text">Execution History</h3>
                <p className="font-sans text-[12px] text-text-muted">Select a run below to audit deep validation details</p>
              </div>
              <DataTable
                columns={runsColumns}
                data={runs}
                onRowClick={(item) => setSelectedRunId(item.runId)}
                rowClassName="cursor-pointer"
              />
            </div>
          </div>

          {/* Details Sidebar Card */}
          <div className="lg:col-span-1">
            <div className="rounded-card border border-border bg-surface p-5 shadow-card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <h3 className="font-sans text-[14px] font-semibold text-text">Validation Details</h3>
                  <FileText size={16} className="text-primary" />
                </div>

                {isDetailLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 bg-surface-muted rounded w-1/3" />
                    <div className="space-y-2.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="h-4 bg-surface-muted rounded" />
                      ))}
                    </div>
                  </div>
                ) : isDetailError || !runDetail ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Info className="h-10 w-10 text-text-subtle" />
                    <h4 className="mt-3 text-[13px] font-bold text-text-muted">No Run Selected</h4>
                    <p className="mt-1 text-xs text-text-subtle max-w-[200px]">
                      {selectedRunId ? 'Failed to fetch details for this run.' : 'Select a training run from the table to view metrics and parameter audit logs.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-text-subtle break-all max-w-[180px]">
                        ID: {runDetail.runId}
                      </span>
                      <Badge status={runDetail.status === 'finished' ? 'success' : 'danger'}>
                        {runDetail.status}
                      </Badge>
                    </div>

                    <KeyValueList items={detailItems} />

                    <div className="bg-surface-muted rounded-md p-3 border border-border mt-4">
                      <h4 className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-subtle mb-1">
                        Pipeline Result
                      </h4>
                      <p className="text-xs text-text font-medium leading-relaxed">
                        {runDetail.result}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
