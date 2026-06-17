import { PageHeader } from '../components/layout/PageHeader';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader title="404 — Not Found" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-card font-semibold text-text-muted mb-2">Page Not Found</h2>
        <p className="text-body text-text-subtle mb-4">The route you are trying to reach does not exist.</p>
        <a
          href="/"
          className="rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary hover:bg-primary-hover"
        >
          Go to Overview
        </a>
      </div>
    </div>
  );
}
