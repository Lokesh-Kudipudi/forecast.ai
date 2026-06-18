import { useQuery } from '@tanstack/react-query';
import { getPipelinesDags, getPipelinesRuns, getDvcVersions } from '../api/pipelines';

export function usePipelinesDags() {
  return useQuery({
    queryKey: ['pipelines', 'dags'],
    queryFn: getPipelinesDags,
  });
}

export function usePipelinesRuns() {
  return useQuery({
    queryKey: ['pipelines', 'runs'],
    queryFn: getPipelinesRuns,
  });
}

export function useDvcVersions() {
  return useQuery({
    queryKey: ['dvc', 'versions'],
    queryFn: getDvcVersions,
  });
}
