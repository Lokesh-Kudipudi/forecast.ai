import { apiClient } from '../lib/apiClient';
import type { CitySnapshot, ForecastResult } from '../types/api';

export async function getCities(): Promise<CitySnapshot[]> {
  const { data } = await apiClient.get<CitySnapshot[]>('/cities');
  return data;
}

export async function postPredict(city: string): Promise<ForecastResult> {
  const { data } = await apiClient.post<ForecastResult>('/predict', { city });
  return data;
}
