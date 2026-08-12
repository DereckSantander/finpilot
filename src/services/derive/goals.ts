import { addMonths, differenceInCalendarMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { sumCents } from '@/lib/money';
import { toYearMonth } from '@/lib/date';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { monthSeries } from '@/services/derive/series';
import type { Ledger } from '@/services/ledger/types';
import type { GoalRow } from '@/db/schema';
import type { GoalId } from '@/types/ids';
import type { IsoDate, YearMonth } from '@/types/common';

/** Meses de la ventana móvil con la que se mide el ritmo de ahorro. */
const PACE_WINDOW_MONTHS = 6;

export interface GoalProgress {
  goal: GoalRow;
  saved: Cents;
  remaining: Cents;
  percent: number; // 0–1
}

export interface GoalDetail {
  goal: GoalRow;
  saved: Cents;
  remaining: Cents;
  percent: number; // 0–1
  contributionsCount: number;
  monthlyAverage: Cents; // ritmo de ahorro mensual observado
  monthsToComplete: number | null; // según el ritmo actual (null si no hay ritmo)
  projectedDate: IsoDate | null; // fecha estimada de cumplimiento
  requiredMonthly: Cents | null; // aporte mensual necesario para la fecha objetivo
  onTrack: boolean | null; // ritmo actual ≥ requerido (si hay fecha objetivo)
  reached: boolean;
}

export interface GoalMonthlyPoint {
  yearMonth: YearMonth;
  label: string;
  amount: Cents;
}

export interface GoalProjection {
  labels: string[];
  actual: (number | null)[];
  projected: (number | null)[];
  target: number;
}

/**
 * Ahorro acumulado en **todas** las metas, archivadas incluidas.
 *
 * Es el número que debe restar del dinero disponible: ese dinero salió de la
 * caja aunque la meta se haya archivado después. Se suman los saldos ya
 * clampeados por meta del índice, de modo que coincide con lo que muestran las
 * tarjetas de la pantalla de Metas.
 */
export function deriveTotalSaved(ledger: Ledger): Cents {
  return asCents([...ledger.index.savedByGoal.values()].reduce((acc, v) => acc + v, 0));
}

/** Ahorro acumulado solo en las metas **activas** (lo que suma la pantalla de Metas). */
export function deriveActiveSaved(ledger: Ledger): Cents {
  return asCents(
    ledger.goals
      .filter((g) => !g.isArchived)
      .reduce((acc, g) => acc + (ledger.index.savedByGoal.get(g.id) ?? 0), 0),
  );
}

/** Progreso de todas las metas activas. */
export function deriveGoalsProgress(ledger: Ledger): GoalProgress[] {
  return ledger.goals
    .filter((g) => !g.isArchived)
    .map((goal) => {
      const saved = ledger.index.savedByGoal.get(goal.id) ?? ZERO_CENTS;
      const percent = goal.targetAmount > 0 ? Math.min(saved / goal.targetAmount, 1) : 0;
      return {
        goal,
        saved,
        remaining: asCents(Math.max(goal.targetAmount - saved, 0)),
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

/**
 * Ritmo de ahorro mensual observado en los últimos `PACE_WINDOW_MONTHS` meses.
 * Antes se promediaba desde el primer aporte, lo que hacía que un aporte antiguo
 * y aislado siguiera contando como "ritmo" durante años. La ventana se acorta si
 * la meta es más joven, y se acota también por arriba: un aporte con fecha
 * futura no es ritmo *observado*.
 */
function monthlyPace(
  contribs: readonly { date: IsoDate; amount: number }[],
  saved: number,
  currentYm: YearMonth,
): number {
  if (contribs.length === 0 || saved <= 0) return 0;

  const firstDate = contribs.reduce((min, c) => (c.date < min ? c.date : min), contribs[0]!.date);
  const monthsSinceFirst =
    differenceInCalendarMonths(parseISO(`${currentYm}-01`), parseISO(firstDate)) + 1;
  const window = Math.min(Math.max(monthsSinceFirst, 1), PACE_WINDOW_MONTHS);

  const anchor = parseISO(`${currentYm}-01`);
  const cutoff = format(addMonths(anchor, -(window - 1)), 'yyyy-MM');
  const recent = contribs
    .filter((c) => {
      const month = toYearMonth(c.date);
      return month >= cutoff && month <= currentYm;
    })
    .reduce((acc, c) => acc + c.amount, 0);

  return Math.round(Math.max(recent, 0) / window);
}

export function deriveGoalDetail(ledger: Ledger, goalId: GoalId): GoalDetail | undefined {
  const goal = ledger.index.goalById.get(goalId);
  if (!goal) return undefined;

  const contribs = ledger.index.contributionsByGoal.get(goalId) ?? [];
  const saved = ledger.index.savedByGoal.get(goalId) ?? ZERO_CENTS;
  const remaining = Math.max(goal.targetAmount - saved, 0);
  const percent = goal.targetAmount > 0 ? Math.min(saved / goal.targetAmount, 1) : 0;
  const reached = goal.targetAmount > 0 && saved >= goal.targetAmount;

  const monthlyAverage = monthlyPace(contribs, saved, ledger.currentYearMonth);
  const monthsToComplete = reached
    ? 0
    : monthlyAverage > 0
      ? Math.ceil(remaining / monthlyAverage)
      : null;
  const projectedDate =
    monthsToComplete !== null
      ? (format(addMonths(parseISO(ledger.today), monthsToComplete), 'yyyy-MM-dd') as IsoDate)
      : null;

  let requiredMonthly: number | null = null;
  let onTrack: boolean | null = null;
  if (goal.targetDate && !reached) {
    const monthsUntil = Math.max(
      differenceInCalendarMonths(parseISO(goal.targetDate), parseISO(ledger.today)),
      1,
    );
    requiredMonthly = Math.ceil(remaining / monthsUntil);
    onTrack = monthlyAverage >= requiredMonthly;
  }

  return {
    goal,
    saved,
    remaining: asCents(remaining),
    percent,
    contributionsCount: contribs.length,
    monthlyAverage: asCents(monthlyAverage),
    monthsToComplete,
    projectedDate,
    requiredMonthly: requiredMonthly !== null ? asCents(requiredMonthly) : null,
    onTrack,
    reached,
  };
}

/** Aportes por mes de una meta (para el gráfico de barras). */
export function deriveGoalMonthlyContrib(
  ledger: Ledger,
  goalId: GoalId,
  months = 6,
): GoalMonthlyPoint[] {
  const contribs = ledger.index.contributionsByGoal.get(goalId) ?? [];
  return monthSeries(ledger.currentYearMonth, months, (ym) => ({
    amount: sumCents(contribs.filter((c) => toYearMonth(c.date) === ym).map((c) => c.amount)),
  }));
}

/**
 * Serie de proyección: ahorro acumulado real de los últimos meses y su
 * proyección hacia el objetivo según el ritmo actual.
 */
export function deriveGoalProjection(
  ledger: Ledger,
  goalId: GoalId,
  options: { pastMonths?: number; maxFuture?: number } = {},
): GoalProjection | undefined {
  const goal = ledger.index.goalById.get(goalId);
  if (!goal) return undefined;

  const pastMonths = options.pastMonths ?? 6;
  const maxFuture = options.maxFuture ?? 18;
  const contribs = ledger.index.contributionsByGoal.get(goalId) ?? [];

  const cumNet = (ym: string) =>
    contribs.filter((c) => toYearMonth(c.date) <= ym).reduce((acc, c) => acc + c.amount, 0);

  const past = monthSeries(ledger.currentYearMonth, pastMonths, (ym) => ({
    value: Math.max(cumNet(ym), 0),
  }));
  const pastLabels = past.map((p) => p.label);
  const pastValues = past.map((p) => p.value);

  const saved = ledger.index.savedByGoal.get(goalId) ?? ZERO_CENTS;
  const monthlyAverage = monthlyPace(contribs, saved, ledger.currentYearMonth);
  const remaining = Math.max(goal.targetAmount - saved, 0);

  const anchor = parseISO(`${ledger.currentYearMonth}-01`);
  const futureLabels: string[] = [];
  const futureValues: number[] = [];
  if (monthlyAverage > 0 && remaining > 0) {
    let running = pastValues[pastValues.length - 1] ?? saved;
    let k = 0;
    while (running < goal.targetAmount && k < maxFuture) {
      running = Math.min(running + monthlyAverage, goal.targetAmount);
      k += 1;
      futureLabels.push(format(addMonths(anchor, k), 'LLL', { locale: es }));
      futureValues.push(running);
    }
  }

  const labels = [...pastLabels, ...futureLabels];
  const actual = [...pastValues, ...futureValues.map(() => null)];
  const projected: (number | null)[] = pastValues.map(() => null);
  if (pastValues.length > 0) projected[pastValues.length - 1] = pastValues[pastValues.length - 1]!;
  projected.push(...futureValues);

  return { labels, actual, projected, target: goal.targetAmount };
}
