import { PageHeader } from '../components/layout/PageHeader';

export default function DriftPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Data Drift Analysis"
        subtitle="KS-test statistical drift metrics for serving features"
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Data Drift Analysis placeholder. Data integration will be wired in Phase 5.</p>
      </div>
    </div>
  );
}
