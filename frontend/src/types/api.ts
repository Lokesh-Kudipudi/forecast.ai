export type StatusLevel = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type ModelStage = 'Production' | 'Staging' | 'Archived';
export type AqiCategory = 'good' | 'moderate' | 'unhealthySensitive' | 'veryUnhealthy' | 'hazardous';
export type DagStatus = 'success' | 'warning' | 'failed' | 'running';

export interface TrendDelta {
  direction: 'up' | 'down' | 'flat';
  value: number; // absolute delta
  label: string; // e.g. "vs prev model"
}

export interface TimeseriesPoint {
  t: string;
  value: number;
}

export interface OverviewSummary {
  productionModel: { name: string; version: string; stage: ModelStage; algorithm: string };
  validationRmse: { value: number; trend: TrendDelta };
  latencyP95Ms: { value: number; trend: TrendDelta };
  forecastVsActual: Record<string, { forecast: TimeseriesPoint[]; actual: TimeseriesPoint[]; rmse: number }>;
  dagHealth: DagSummary[];
  citySnapshot: CitySnapshot[];
}

export interface CitySnapshot {
  city: string;
  aqi: number;
  category: AqiCategory;
  peak24h: number;
  pm25: number;
  updatedAt: string;
}

export interface ForecastResult {
  city: string;
  current: {
    aqi: number;
    category: AqiCategory;
    pm25: number;
    pm10: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  hourly: { hour: string; aqi: number; category: AqiCategory }[]; // 24 points
  modelVersion: string;
}

export interface ModelVersion {
  version: string;
  algorithm: string;
  stage: ModelStage;
  rmse: number;
  mae: number;
  registeredAt: string;
}

export interface PromotionEvent {
  at: string;
  change: string;
  trigger: 'auto' | 'manual';
  note: string;
}

export interface ModelsResponse {
  name: string; // 'aqi_forecaster_prod'
  versions: ModelVersion[];
  production: { rmse: number; trend: TrendDelta };
  lastPromotion: PromotionEvent | null;
  candidateComparison: {
    baselineRmse: number;
    productionRmse: number;
    candidateRmse: number;
    candidateVersion: string | null;
    beatsBaseline: boolean;
    beatsProduction: boolean;
  } | null;
  promotionHistory: PromotionEvent[];
}

export interface PromotionResult {
  name: string;
  version: string;
  newStage: ModelStage;
}

export interface TrainingRun {
  runId: string;
  startedAt: string;
  nEstimators: number;
  maxDepth: number;
  baselineRmse: number;
  improvedRmse: number | null;
  result: string;
  status: 'finished' | 'failed';
}

export interface TrainingRunDetail extends TrainingRun {
  mae: number | null;
  dvcVersion: string;
  artifactPath: string;
  registeredVersion: string | null;
}


export interface DagSummary {
  dag: string;
  schedule: string;
  lastRun: string;
  avgDurationSeconds: number;
  successRate: number;
  status: DagStatus;
}

export interface DagRun {
  dag: string;
  runId: string;
  startedAt: string;
  durationSeconds: number;
  dvcVersion: string;
  status: DagStatus;
}

export interface DvcVersion {
  hash: string;
  rows: number;
  pushedAt: string;
  remote: string;
}

export interface MonitoringSummary {
  requestsPerMin: { value: number; trend: TrendDelta };
  latency: { p50: number; p95: number; p99: number };
  errorRate: number;
  uptime30d: number;
  incidents30d: number;
}

export interface Alert {
  at: string;
  source: string;
  message: string;
  severity: 'warning' | 'critical';
}
