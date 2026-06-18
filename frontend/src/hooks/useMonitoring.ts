import { useQuery } from '@tanstack/react-query';
import { getMonitoringSummary, getMonitoringTimeseries, getMonitoringAlerts } from '../api/monitoring';

export function useMonitoringSummary() {
  return useQuery({
    queryKey: ['monitoring', 'summary'],
    queryFn: getMonitoringSummary,
  });
}

export function useMonitoringTimeseries(metric: 'latency_p95' | 'throughput') {
  return useQuery({
    queryKey: ['monitoring', 'timeseries', metric],
    queryFn: () => getMonitoringTimeseries(metric),
  });
}

export function useMonitoringAlerts() {
  return useQuery({
    queryKey: ['monitoring', 'alerts'],
    queryFn: getMonitoringAlerts,
  });
}
