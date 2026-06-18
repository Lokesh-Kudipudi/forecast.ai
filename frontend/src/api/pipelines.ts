import { apiClient } from '../lib/apiClient';
import type { DagSummary, DagRun, DvcVersion } from '../types/api';

export async function getPipelinesDags(): Promise<DagSummary[]> {
  const { data } = await apiClient.get<DagSummary[]>('/pipelines/dags');
  return data;
}

export async function getPipelinesRuns(): Promise<DagRun[]> {
  const { data } = await apiClient.get<DagRun[]>('/pipelines/runs');
  return data;
}

export async function getDvcVersions(): Promise<DvcVersion[]> {
  const { data } = await apiClient.get<DvcVersion[]>('/dvc/versions');
  return data;
}
