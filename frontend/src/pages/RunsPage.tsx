import { PageHeader } from '../components/layout/PageHeader';

export default function RunsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Training Runs"
        subtitle="Observe baseline-vs-improved model metrics"
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Training Runs placeholder. Data integration will be wired in Phase 4.</p>
      </div>
    </div>
  );
}
