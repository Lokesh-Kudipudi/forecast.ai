import { apiClient } from '../lib/apiClient';
import type { MonitoringSummary, TimeseriesPoint, Alert } from '../types/api';

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
  const { data } = await apiClient.get<MonitoringSummary>('/monitoring/summary');
  return data;
}

export async function getMonitoringTimeseries(metric: 'latency_p95' | 'throughput'): Promise<TimeseriesPoint[]> {
  const { data } = await apiClient.get<TimeseriesPoint[]>('/monitoring/timeseries', {
    params: { metric },
  });
  return data;
}

export async function getMonitoringAlerts(): Promise<Alert[]> {
  const { data } = await apiClient.get<Alert[]>('/monitoring/alerts');
  return data;
}
