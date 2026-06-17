import axios from 'axios';
import type { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error('[apiClient] VITE_API_BASE_URL is not set');
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Optional shared service token (unset by default; the ONLY auth attach point).
apiClient.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_API_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors so callers always get a typed ApiError (never a raw AxiosError).
export interface ApiError {
  status: number;
  message: string;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string }>) => {
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message:
        error.response?.data?.detail ??
        error.message ??
        'Unexpected network error',
    };
    return Promise.reject(apiError);
  },
);
