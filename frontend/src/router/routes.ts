export const ROUTES = {
  overview: '/',
  forecasts: '/forecasts',
  models: '/models',
  runs: '/runs',
  drift: '/drift',
  pipelines: '/pipelines',
  monitoring: '/monitoring',
} as const;

export const NAV_ITEMS = [
  { to: ROUTES.overview, label: 'Overview' },
  { to: ROUTES.forecasts, label: 'Forecasts' },
  { to: ROUTES.models, label: 'Model Registry' },
  { to: ROUTES.runs, label: 'Training Runs' },
  { to: ROUTES.drift, label: 'Data Drift' },
  { to: ROUTES.pipelines, label: 'Pipelines' },
  { to: ROUTES.monitoring, label: 'Monitoring' },
] as const;
