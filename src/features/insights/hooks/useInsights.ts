import { useLiveQuery } from 'dexie-react-hooks';
import { insightsQuery } from '@/services/insights.service';
import type { Insight } from '@/lib/insights/types';

/** Insights financieros reactivos derivados de los datos reales (F10b). */
export function useInsights(): Insight[] | undefined {
  return useLiveQuery(() => insightsQuery(), []);
}
