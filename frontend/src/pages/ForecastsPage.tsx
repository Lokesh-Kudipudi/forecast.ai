import { PageHeader } from '../components/layout/PageHeader';

export default function ForecastsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="AQI Forecasts"
        subtitle="Live and on-demand 24-hour forecasting"
      />
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-muted">Forecasts Dashboard placeholder. Data integration will be wired in Phase 2.</p>
      </div>
    </div>
  );
}
