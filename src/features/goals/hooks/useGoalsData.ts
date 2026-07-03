import { useLiveQuery } from 'dexie-react-hooks';
import {
  goalsProgressQuery,
  goalDetailQuery,
  goalMonthlyContribQuery,
  goalProjectionQuery,
  type GoalProgress,
  type GoalDetail,
  type GoalMonthlyPoint,
  type GoalProjection,
} from '@/services/metrics.service';
import { contributionsByGoalQuery } from '@/services/goalContributions.service';
import type { GoalContributionRow } from '@/db/schema';
import type { GoalId } from '@/types/ids';

/** Progreso reactivo de todas las metas activas. */
export function useGoals(): GoalProgress[] | undefined {
  return useLiveQuery(() => goalsProgressQuery(), []);
}

/** Detalle reactivo de una meta (ahorro, ritmo y proyección). */
export function useGoalDetail(goalId: GoalId): GoalDetail | undefined {
  return useLiveQuery(() => goalDetailQuery(goalId), [goalId]);
}

/** Aportes de una meta (historial), reactivo. */
export function useGoalContributions(goalId: GoalId): GoalContributionRow[] | undefined {
  return useLiveQuery(() => contributionsByGoalQuery(goalId), [goalId]);
}

/** Aportes por mes (para gráfico de barras), reactivo. */
export function useGoalMonthly(goalId: GoalId, months = 6): GoalMonthlyPoint[] | undefined {
  return useLiveQuery(() => goalMonthlyContribQuery(goalId, months), [goalId, months]);
}

/** Serie de proyección hacia el objetivo, reactivo. */
export function useGoalProjection(goalId: GoalId): GoalProjection | undefined {
  return useLiveQuery(() => goalProjectionQuery(goalId), [goalId]);
}
