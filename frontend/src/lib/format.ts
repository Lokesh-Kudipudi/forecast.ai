import { formatDistanceToNow } from 'date-fns';
import type { AqiCategory } from '../types/api';

/**
 * Returns a relative time string (e.g., "12 min ago") from an ISO-8601 string.
 */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (error) {
    console.error('[format] Failed to format date', iso, error);
    return 'invalid date';
  }
}

/**
 * Rounds a number to a fixed decimal precision for display.
 */
export function formatNumber(value: number, digits = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return value.toFixed(digits);
}

/**
 * Classifies a raw numerical AQI score into one of the canonical categories.
 */
export function aqiCategoryFor(value: number): AqiCategory {
  if (value <= 50) return 'good';
  if (value <= 100) return 'moderate';
  if (value <= 150) return 'unhealthySensitive';
  if (value <= 200) return 'veryUnhealthy';
  return 'hazardous';
}
