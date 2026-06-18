import { apiClient } from '../lib/apiClient';
import type { ModelsResponse, PromotionResult } from '../types/api';

export async function getModels(): Promise<ModelsResponse> {
  const { data } = await apiClient.get<ModelsResponse>('/models');
  return data;
}

export async function promoteModel(
  name: string,
  version: string
): Promise<PromotionResult> {
  const { data } = await apiClient.post<PromotionResult>(
    `/models/${name}/versions/${version}/promote`
  );
  return data;
}
