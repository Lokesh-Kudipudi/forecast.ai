import { apiClient } from '../lib/apiClient';
import type { DriftReport } from '../types/api';

export async function getDriftLatest(): Promise<DriftReport> {
  const { data } = await apiClient.get<DriftReport>('/drift/latest');
  return data;
}
