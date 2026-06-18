import { useQuery } from '@tanstack/react-query';
import { getDriftLatest } from '../api/drift';

export function useDrift() {
  return useQuery({
    queryKey: ['drift', 'latest'],
    queryFn: getDriftLatest,
    retry: false, // Don't retry since 400 (insufficient requests) is a persistent state until forecasts are made
  });
}
