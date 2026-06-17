import { PageHeader } from '../components/layout/PageHeader';

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Model Registry"
        subtitle="Manage MLflow model versions and stage promotions"
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Model Registry placeholder. Data integration will be wired in Phase 3.</p>
      </div>
    </div>
  );
}
