import { apiClient } from '../lib/apiClient';
import type { OverviewSummary } from '../types/api';

export async function getOverviewSummary(): Promise<OverviewSummary> {
  const { data } = await apiClient.get<OverviewSummary>('/overview/summary');
  return data;
}
