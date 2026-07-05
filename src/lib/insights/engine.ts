import { INSIGHT_RULES } from '@/lib/insights/rules';
import {
  SEVERITY_RANK,
  type Insight,
  type InsightContext,
  type InsightRule,
} from '@/lib/insights/types';

/**
 * Ejecuta las reglas sobre el contexto y devuelve los insights ordenados por
 * severidad (críticos primero). Función pura: no toca la base de datos.
 */
export function runInsights(ctx: InsightContext, rules: InsightRule[] = INSIGHT_RULES): Insight[] {
  const results: Insight[] = [];
  for (const rule of rules) {
    const out = rule(ctx);
    if (!out) continue;
    if (Array.isArray(out)) results.push(...out);
    else results.push(out);
  }
  return results.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
