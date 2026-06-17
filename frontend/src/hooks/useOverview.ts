import { useQuery } from '@tanstack/react-query';
import { getOverviewSummary } from '../api/overview';
import { REFRESH_INTERVAL_MS } from '../lib/constants';

export function useOverviewSummary() {
  return useQuery({
    queryKey: ['overview', 'summary'],
    queryFn: getOverviewSummary,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
