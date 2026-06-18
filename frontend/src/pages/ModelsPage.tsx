import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useModels, usePromoteModel } from '../hooks/useModels';
import { StatCard } from '../components/ui/StatCard';
import { TrendBadge } from '../components/ui/TrendBadge';
import { StageChip } from '../components/ui/StageChip';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatRelativeTime, formatNumber } from '../lib/format';
import type { ModelVersion, PromotionEvent } from '../types/api';
import type { ApiError } from '../lib/apiClient';
import { RefreshCw, AlertCircle, Cpu, ShieldAlert, Award } from 'lucide-react';
import { cn } from '../lib/cn';

export default function ModelsPage() {
  const { data, isLoading, isError, isFetching, error, refetch } = useModels();
  const promoteMutation = usePromoteModel();

  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRefresh = () => {
    refetch();
  };

  const handlePromoteClick = (version: ModelVersion) => {
    setSelectedVersion(version);
    setIsModalOpen(true);
    promoteMutation.reset();
  };

  const handlePromoteConfirm = () => {
    if (!selectedVersion || !data) return;
    promoteMutation.mutate(
      { name: data.name, version: selectedVersion.version },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setSelectedVersion(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Model Registry"
          subtitle="Manage MLflow model versions and stage promotions"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-[240px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-1" />
          <div className="h-[240px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-2" />
        </div>
        <div className="mt-8">
          <div className="h-[250px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const errMsg = (error as any)?.message || 'Failed to connect to the MLOps backend console.';
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <PageHeader
          title="Model Registry"
          subtitle="Manage MLflow model versions and stage promotions"
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
            {errMsg} Ensure the FastAPI service is running at <code className="font-mono text-danger font-semibold bg-danger-soft/60 px-1 rounded">localhost:8000</code>.
          </p>
        </div>
      </div>
    );
  }

  const versionsColumns = [
    {
      key: 'version',
      header: 'Version',
      className: 'w-[90px]',
      render: (item: ModelVersion) => (
        <span className="font-mono font-bold text-text">v{item.version}</span>
      ),
    },
    {
      key: 'algorithm',
      header: 'Algorithm',
      render: (item: ModelVersion) => (
        <span className="font-mono text-text">{item.algorithm}</span>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'w-[120px]',
      render: (item: ModelVersion) => <StageChip stage={item.stage} />,
    },
    {
      key: 'rmse',
      header: 'RMSE',
      className: 'w-[100px]',
      render: (item: ModelVersion) => (
        <span className="font-mono text-text-muted">{formatNumber(item.rmse, 2)}</span>
      ),
    },
    {
      key: 'mae',
      header: 'MAE',
      className: 'w-[100px]',
      render: (item: ModelVersion) => (
        <span className="font-mono text-text-muted">{formatNumber(item.mae, 2)}</span>
      ),
    },
    {
      key: 'registeredAt',
      header: 'Registered',
      render: (item: ModelVersion) => (
        <span className="text-text-muted">{formatRelativeTime(item.registeredAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'w-[100px] text-right',
      render: (item: ModelVersion) => {
        if (item.stage === 'Staging') {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePromoteClick(item)}
            >
              Promote
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const historyColumns = [
    {
      key: 'change',
      header: 'Change',
      className: 'w-[180px]',
      render: (item: PromotionEvent) => (
        <span className="font-sans font-semibold text-text">{item.change}</span>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger',
      className: 'w-[100px]',
      render: (item: PromotionEvent) => (
        <Badge status={item.trigger === 'auto' ? 'success' : 'info'}>
          {item.trigger}
        </Badge>
      ),
    },
    {
      key: 'note',
      header: 'Operator Notes',
      render: (item: PromotionEvent) => (
        <span className="text-text-muted">{item.note}</span>
      ),
    },
    {
      key: 'at',
      header: 'Promoted',
      className: 'w-[160px]',
      render: (item: PromotionEvent) => (
        <span className="text-text-muted">{formatRelativeTime(item.at)}</span>
      ),
    },
  ];

  const candidate = data.candidateComparison;
  const stagingVersion = data.versions.find((v) => v.stage === 'Staging');

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Model Registry"
        subtitle="Manage MLflow model versions and stage promotions"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? 'mr-1.5 h-3.5 w-3.5 animate-spin' : 'mr-1.5 h-3.5 w-3.5'} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Registered Versions"
          value={data.versions.length}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <Cpu size={14} className="text-text-subtle" />
              <span className="text-text-muted">
                Latest: <strong className="font-mono text-text">v{data.versions[0]?.version || '—'}</strong>
              </span>
            </div>
          }
        />
        <StatCard
          label="Production RMSE"
          value={formatNumber(data.production.rmse, 2)}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendBadge
                direction={data.production.trend.direction}
                value={formatNumber(data.production.trend.value, 2)}
                goodWhen="down"
              />
              <span className="text-text-muted">{data.production.trend.label}</span>
            </div>
          }
        />
        <StatCard
          label="Last Promotion Event"
          value={data.lastPromotion ? data.lastPromotion.change : 'None'}
          footer={
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-text-muted">
                {data.lastPromotion
                  ? formatRelativeTime(data.lastPromotion.at)
                  : 'No manual or automatic promotions recorded'}
              </span>
            </div>
          }
        />
      </div>

      {/* Candidate Comparison & Registered Models Section */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Candidate Comparison Card */}
        <div className="lg:col-span-1">
          <div className="rounded-card border border-border bg-surface p-5 shadow-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h3 className="font-sans text-[14px] font-semibold text-text">Candidate Promotion</h3>
                <Award size={16} className="text-accent" />
              </div>

              {candidate && stagingVersion ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted font-sans text-body">Staging Version</span>
                    <span className="font-mono font-bold text-[14px] bg-primary-soft text-primary-hover px-2 py-0.5 rounded-sm">
                      v{candidate.candidateVersion}
                    </span>
                  </div>

                  <div className="bg-surface-muted rounded-md p-3 border border-border space-y-2.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-muted">Candidate RMSE:</span>
                      <span className="font-mono font-bold text-text">{formatNumber(candidate.candidateRmse, 2)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-muted">Production RMSE:</span>
                      <span className="font-mono text-text-muted">{formatNumber(candidate.productionRmse, 2)}</span>
                    </div>
                    <div className="flex justify-between text-[12px] border-t border-border/60 pt-2 font-medium">
                      <span className="text-text">Accuracy Shift:</span>
                      <span
                        className={cn(
                          'font-mono font-bold',
                          candidate.candidateRmse < candidate.productionRmse ? 'text-success' : 'text-danger'
                        )}
                      >
                        {candidate.candidateRmse < candidate.productionRmse ? '▼' : '▲'}{' '}
                        {formatNumber(Math.abs(candidate.candidateRmse - candidate.productionRmse), 2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-[7px] w-[7px] rounded-pill',
                          candidate.beatsBaseline ? 'bg-success' : 'bg-danger'
                        )}
                      />
                      <span className="text-[12px] text-text-muted">
                        {candidate.beatsBaseline ? 'Beats baseline model (v1)' : 'Fails baseline RMSE target'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-[7px] w-[7px] rounded-pill',
                          candidate.beatsProduction ? 'bg-success' : 'bg-warning'
                        )}
                      />
                      <span className="text-[12px] text-text-muted">
                        {candidate.beatsProduction ? 'Outperforms active Production model' : 'RMSE higher than Production'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShieldAlert className="h-10 w-10 text-text-subtle" />
                  <h4 className="mt-3 text-[13px] font-bold text-text-muted">No Staging Candidate</h4>
                  <p className="mt-1 text-xs text-text-subtle max-w-[200px]">
                    No model is currently in the Staging pool. Retraining run will promote candidate to Staging.
                  </p>
                </div>
              )}
            </div>

            {candidate && stagingVersion ? (
              <div className="mt-6 border-t border-border pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handlePromoteClick(stagingVersion)}
                >
                  Promote v{candidate.candidateVersion} to Production
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Registered Versions Table */}
        <div className="lg:col-span-2">
          <div className="rounded-card border border-border bg-surface p-5 shadow-card h-full flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-sans text-[14px] font-semibold text-text">Registered Model Versions</h3>
              <p className="font-sans text-[12px] text-text-muted">All tracked version states inside the MLflow model registry</p>
            </div>
            <div className="flex-grow">
              <DataTable
                columns={versionsColumns}
                data={data.versions}
                className="border-none shadow-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Promotion History DataTable */}
      <div className="mt-8">
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="mb-4">
            <h3 className="font-sans text-[14px] font-semibold text-text">Promotion History</h3>
            <p className="font-sans text-[12px] text-text-muted">Audit logs of manual and automated model registry stage promotions</p>
          </div>
          <DataTable
            columns={historyColumns}
            data={data.promotionHistory}
            className="border-none shadow-none bg-transparent"
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedVersion ? (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !promoteMutation.isPending && setIsModalOpen(false)}
          title="Confirm Model Promotion"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={promoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePromoteConfirm}
                loading={promoteMutation.isPending}
              >
                Confirm Promotion
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-body text-text-muted">
              You are about to promote <strong className="text-text">v{selectedVersion.version} ({selectedVersion.algorithm})</strong> to the <strong className="text-success">Production</strong> stage.
            </p>
            <div className="bg-surface-muted rounded-md p-4 border border-border">
              <h4 className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-subtle mb-2">
                Metric Comparison
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-body">
                  <span className="text-text-muted">Candidate RMSE (v{selectedVersion.version}):</span>
                  <span className="font-mono font-bold text-text">{formatNumber(selectedVersion.rmse, 2)}</span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-text-muted">Current Production RMSE:</span>
                  <span className="font-mono text-text-muted">
                    {formatNumber(data.production.rmse, 2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2 font-medium text-body">
                  <span className="text-text">Delta:</span>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      selectedVersion.rmse < data.production.rmse ? 'text-success' : 'text-danger'
                    )}
                  >
                    {selectedVersion.rmse < data.production.rmse ? '▼' : '▲'}{' '}
                    {formatNumber(Math.abs(selectedVersion.rmse - data.production.rmse), 2)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-text-subtle">
              Note: This action is permanent. The current active model will be transitioned to the <strong className="text-text-muted uppercase">Archived</strong> stage automatically.
            </p>
            {promoteMutation.isError ? (
              <p className="text-xs text-danger font-medium mt-2">
                Error: {(promoteMutation.error as unknown as ApiError)?.message || 'Failed to promote model'}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
