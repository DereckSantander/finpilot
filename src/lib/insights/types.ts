import type { SettingsRow } from '@/db/schema';
import type {
  DashboardMetrics,
  TrendPoint,
  CategorySlice,
  GoalProgress,
  CardSummary,
  EmergencyFundStatus,
} from '@/services/metrics.service';

/**
 * Motor de inteligencia financiera (F10b). Patrón Strategy: cada regla es una
 * función pura `(ctx) => Insight | Insight[] | null`. El servicio construye el
 * contexto (agregados reales) y ejecuta las reglas, ordenando por severidad.
 */

/** Familias de insight (cada una vive en su propio archivo de regla). */
export type InsightCategory = 'spending' | 'saving' | 'goals' | 'emergency' | 'cards';

/** Severidad: define color, icono y prioridad de orden. */
export type InsightSeverity = 'critical' | 'warning' | 'suggestion' | 'positive' | 'info';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  message: string;
}

/**
 * Datos agregados que reciben las reglas. Se calcula una sola vez por ejecución
 * (ADR-0007: derivado de IndexedDB, nunca almacenado).
 */
export interface InsightContext {
  settings: SettingsRow;
  metrics: DashboardMetrics;
  /** Tendencia de los últimos meses (para comparativas mes a mes). */
  trend: TrendPoint[];
  /** Desglose de gastos del mes en curso por categoría (mayor a menor). */
  topCategories: CategorySlice[];
  goals: GoalProgress[];
  cards: CardSummary[];
  emergencyFund: EmergencyFundStatus;
}

/** Una regla de insight: devuelve 0, 1 o varios insights. */
export type InsightRule = (ctx: InsightContext) => Insight | Insight[] | null;

/** Prioridad de orden (menor = más arriba). */
export const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
  positive: 3,
  info: 4,
};
