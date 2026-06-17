import { PageHeader } from '../components/layout/PageHeader';

export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="System Overview"
        subtitle="Health of the forecast.ai AQI pipeline"
        action={<button className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-body font-semibold text-text hover:bg-surface-muted">↻ Refresh</button>}
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Overview Dashboard placeholder. Data integration will be wired in Phase 1.</p>
      </div>
    </div>
  );
}
