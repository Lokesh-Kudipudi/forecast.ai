import { useQuery } from '@tanstack/react-query';
import { getRuns, getRunDetail } from '../api/runs';

export function useRuns(status?: string) {
  return useQuery({
    queryKey: ['runs', status || 'all'],
    queryFn: () => getRuns(status),
  });
}

export function useRunDetail(runId: string) {
  return useQuery({
    queryKey: ['runs', runId],
    queryFn: () => getRunDetail(runId),
    enabled: !!runId,
  });
}
