import { apiClient } from '../lib/apiClient';
import type { TrainingRun, TrainingRunDetail } from '../types/api';

export async function getRuns(status?: string): Promise<TrainingRun[]> {
  const { data } = await apiClient.get<TrainingRun[]>('/runs', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  return data;
}

export async function getRunDetail(runId: string): Promise<TrainingRunDetail> {
  const { data } = await apiClient.get<TrainingRunDetail>(`/runs/${runId}`);
  return data;
}
