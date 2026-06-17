import { PageHeader } from '../components/layout/PageHeader';

export default function MonitoringPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="Serving Monitoring"
        subtitle="Prometheus latency metrics and active alert tracking"
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Serving Monitoring placeholder. Data integration will be wired in Phase 7.</p>
      </div>
    </div>
  );
}
