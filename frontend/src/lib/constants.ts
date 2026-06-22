import type { AqiCategory } from '../types/api';

/** Polling interval for live pages (Overview, Monitoring), in ms. */
export const REFRESH_INTERVAL_MS = 60_000;

/** Canonical MLflow registered model name (see project-overview.md §6.2). */
export const MODEL_NAME = 'aqi_forecaster_prod';
/** Canonical MLflow experiment name. */
export const EXPERIMENT_NAME = 'aqi_forecaster';

/** AQI category bands → label + max value + css variable class. */
export const AQI_CATEGORIES: Record<AqiCategory, { label: string; max: number; token: string }> = {
  good: { label: 'Good', max: 50, token: 'aqi-good' },
  moderate: { label: 'Moderate', max: 100, token: 'aqi-moderate' },
  unhealthySensitive: { label: 'Unhealthy (SG)', max: 150, token: 'aqi-unhealthy' },
  veryUnhealthy: { label: 'Very Unhealthy', max: 200, token: 'aqi-veryunhealthy' },
  hazardous: { label: 'Hazardous', max: Infinity, token: 'aqi-hazardous' },
};

/** Outbound links to external monitoring/orchestration systems. */
export const EXTERNAL_LINKS = {
  dagshub: 'https://dagshub.com',
  airflow: '/airflow',
  grafana: '/grafana',
} as const;
