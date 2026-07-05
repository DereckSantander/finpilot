import type { InsightRule } from '@/lib/insights/types';
import { spendingTrendRule } from './spendingTrend';
import { categoryOpportunityRule } from './categoryOpportunity';
import { savingCapacityRule } from './savingCapacity';
import { emergencyFundRule } from './emergencyFund';
import { cardUtilizationRule } from './cardUtilization';
import { goalsMomentumRule } from './goalsMomentum';

/** Reglas activas del motor de inteligencia financiera (las 6 familias del PDF). */
export const INSIGHT_RULES: InsightRule[] = [
  spendingTrendRule,
  categoryOpportunityRule,
  savingCapacityRule,
  emergencyFundRule,
  cardUtilizationRule,
  goalsMomentumRule,
];
