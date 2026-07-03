import { db } from '@/db/db';
import { sumCents } from '@/lib/money';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { toYearMonth, todayIso } from '@/lib/date';
import {
  format,
  parseISO,
  addMonths,
  isBefore,
  getDaysInMonth,
  getDate,
  differenceInCalendarMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { CARD_UTILIZATION_DANGER } from '@/constants/config';
import type {
  GoalRow,
  CreditCardRow,
  StatementStatus,
  CategoryRow,
  BudgetRow,
  PaymentMethodRow,
} from '@/db/schema';
import type { YearMonth, IsoDate, TransactionType } from '@/types/common';
import type { CategoryId, CreditCardId, GoalId } from '@/types/ids';

/**
 * Agregaciones derivadas para el Dashboard (ADR-0007: se calculan al vuelo desde
 * los datos primarios de IndexedDB, nunca se almacenan). Cada función devuelve
 * una promesa apta para `useLiveQuery`, por lo que la UI se actualiza sola.
 */

export interface DashboardMetrics {
  yearMonth: YearMonth;
  monthIncome: Cents;
  monthExpense: Cents;
  monthBalance: Cents;
  savingsRate: number; // 0–1
  totalSaved: Cents;
  available: Cents;
  cardDebt: Cents;
  netWorth: Cents;
  transactionsCount: number;
}

export async function dashboardMetricsQuery(yearMonth: YearMonth): Promise<DashboardMetrics> {
  const [transactions, contributions, payments] = await Promise.all([
    db.transactions.toArray(),
    db.goalContributions.toArray(),
    db.creditCardPayments.toArray(),
  ]);

  const income = transactions.filter((t) => t.type === 'income');
  const expense = transactions.filter((t) => t.type === 'expense');

  const monthIncome = sumCents(
    income.filter((t) => t.yearMonth === yearMonth).map((t) => t.amount),
  );
  const monthExpense = sumCents(
    expense.filter((t) => t.yearMonth === yearMonth).map((t) => t.amount),
  );
  const monthBalance = asCents(monthIncome - monthExpense);
  const savingsRate = monthIncome > 0 ? monthBalance / monthIncome : 0;

  const lifetimeIncome = sumCents(income.map((t) => t.amount));
  const lifetimeExpense = sumCents(expense.map((t) => t.amount));
  const totalSaved = asCents(Math.max(sumCents(contributions.map((c) => c.amount)), 0));

  // Dinero líquido disponible = flujo neto de caja − lo apartado en metas.
  const available = asCents(lifetimeIncome - lifetimeExpense - totalSaved);

  // Deuda de tarjetas = consumos a crédito − pagos (coherente con el módulo de tarjetas).
  const cardConsumos = sumCents(
    expense.filter((t) => t.creditCardId !== undefined).map((t) => t.amount),
  );
  const cardPagos = payments.length > 0 ? sumCents(payments.map((p) => p.amount)) : ZERO_CENTS;
  const cardDebt = asCents(Math.max(cardConsumos - cardPagos, 0));

  // Patrimonio = disponible + ahorrado − deuda.
  const netWorth = asCents(available + totalSaved - cardDebt);

  return {
    yearMonth,
    monthIncome,
    monthExpense,
    monthBalance,
    savingsRate,
    totalSaved,
    available,
    cardDebt,
    netWorth,
    transactionsCount: transactions.length,
  };
}

export interface CategorySlice {
  categoryId: CategoryId;
  name: string;
  color: string;
  total: Cents;
  percent: number; // 0–1 respecto al total de gastos del mes
}

/** Desglose por categoría para un mes y tipo (para el gráfico de dona). */
export async function categoryBreakdownQuery(
  yearMonth: YearMonth,
  type: TransactionType = 'expense',
): Promise<CategorySlice[]> {
  const [transactions, categories] = await Promise.all([
    db.transactions.where('[type+yearMonth]').equals([type, yearMonth]).toArray(),
    db.categories.toArray(),
  ]);

  const byCategory = new Map<string, number>();
  for (const tx of transactions) {
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const total = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const categoriesById = new Map<string, (typeof categories)[number]>(
    categories.map((c) => [c.id, c]),
  );

  const slices: CategorySlice[] = [...byCategory.entries()].map(([categoryId, amount]) => {
    const category = categoriesById.get(categoryId);
    return {
      categoryId: categoryId as CategoryId,
      name: category?.name ?? 'Sin categoría',
      color: category?.color ?? '#94a3b8',
      total: asCents(amount),
      percent: total > 0 ? amount / total : 0,
    };
  });

  return slices.sort((a, b) => b.total - a.total);
}

export interface TrendPoint {
  yearMonth: YearMonth;
  label: string;
  income: Cents;
  expense: Cents;
  balance: Cents;
}

/** Ingresos/gastos de los últimos `months` meses hasta `anchor` (para barras). */
export async function monthlyTrendQuery(anchor: YearMonth, months = 6): Promise<TrendPoint[]> {
  const transactions = await db.transactions.toArray();
  const anchorDate = parseISO(`${anchor}-01`);

  const points: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(anchorDate, -i);
    const ym = format(date, 'yyyy-MM') as YearMonth;
    const monthTx = transactions.filter((t) => t.yearMonth === ym);
    const income = sumCents(monthTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(monthTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    points.push({
      yearMonth: ym,
      label: format(date, 'LLL', { locale: es }),
      income,
      expense,
      balance: asCents(income - expense),
    });
  }
  return points;
}

export interface GoalProgress {
  goal: GoalRow;
  saved: Cents;
  remaining: Cents;
  percent: number; // 0–1
}

/** Progreso de todas las metas activas (ahorro acumulado / objetivo). */
export async function goalsProgressQuery(): Promise<GoalProgress[]> {
  const [goals, contributions] = await Promise.all([
    db.goals.filter((g) => !g.isArchived).toArray(),
    db.goalContributions.toArray(),
  ]);

  const savedByGoal = new Map<string, number>();
  for (const c of contributions) {
    savedByGoal.set(c.goalId, (savedByGoal.get(c.goalId) ?? 0) + c.amount);
  }

  return goals
    .map((goal) => {
      const saved = Math.max(savedByGoal.get(goal.id) ?? 0, 0);
      const percent = goal.targetAmount > 0 ? Math.min(saved / goal.targetAmount, 1) : 0;
      return {
        goal,
        saved: asCents(saved),
        remaining: asCents(Math.max(goal.targetAmount - saved, 0)),
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export interface CardSummary {
  card: CreditCardRow;
  currentBalance: Cents;
  utilization: number; // 0–1
  dueDate: IsoDate;
  daysUntilDue: number;
  status: StatementStatus | 'noStatement';
  isOverLimitWarning: boolean;
}

/** Próxima ocurrencia mensual de un día (para corte y pago). */
function nextMonthlyDate(dayOfMonth: number): IsoDate {
  const today = new Date();
  const day = Math.min(dayOfMonth, 28);
  let next = new Date(today.getFullYear(), today.getMonth(), day);
  if (isBefore(next, new Date(today.getFullYear(), today.getMonth(), today.getDate()))) {
    next = addMonths(next, 1);
  }
  return format(next, 'yyyy-MM-dd') as IsoDate;
}

/** Días desde hoy hasta una fecha ISO (0 si ya pasó). */
function daysUntil(iso: IsoDate): number {
  return Math.max(Math.ceil((parseISO(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0);
}

/**
 * Resumen de tarjetas para listados/dashboard. El consumo actual (deuda) se
 * deriva de los consumos (gastos con `creditCardId`) menos los pagos.
 */
export async function cardsSummaryQuery(): Promise<CardSummary[]> {
  const [cards, transactions, payments] = await Promise.all([
    db.creditCards.filter((c) => !c.isArchived).toArray(),
    db.transactions.filter((t) => t.type === 'expense' && t.creditCardId !== undefined).toArray(),
    db.creditCardPayments.toArray(),
  ]);

  return cards.map((card) => {
    const consumos = transactions
      .filter((t) => t.creditCardId === card.id)
      .reduce((acc, t) => acc + t.amount, 0);
    const pagos = payments
      .filter((p) => p.creditCardId === card.id)
      .reduce((acc, p) => acc + p.amount, 0);
    const balance = Math.max(consumos - pagos, 0);
    const utilization = card.creditLimit > 0 ? balance / card.creditLimit : 0;
    const dueDate = nextMonthlyDate(card.paymentDueDay);

    return {
      card,
      currentBalance: asCents(balance),
      utilization,
      dueDate,
      daysUntilDue: daysUntil(dueDate),
      status: balance === 0 ? 'paid' : 'open',
      isOverLimitWarning: utilization >= CARD_UTILIZATION_DANGER,
    };
  });
}

// --- Detalle de tarjeta ---------------------------------------------------

export interface CardDetail {
  card: CreditCardRow;
  consumosTotal: Cents;
  pagosTotal: Cents;
  currentBalance: Cents;
  available: Cents;
  utilization: number;
  dueDate: IsoDate;
  cutoffDate: IsoDate;
  daysUntilDue: number;
  monthConsumo: Cents;
  monthPago: Cents;
}

export async function cardDetailQuery(cardId: CreditCardId): Promise<CardDetail | undefined> {
  const card = await db.creditCards.get(cardId);
  if (!card) return undefined;

  const [txs, payments] = await Promise.all([
    db.transactions.where('creditCardId').equals(cardId).toArray(),
    db.creditCardPayments.where('creditCardId').equals(cardId).toArray(),
  ]);

  const consumos = txs.filter((t) => t.type === 'expense');
  const consumosTotal = sumCents(consumos.map((t) => t.amount));
  const pagosTotal = payments.length > 0 ? sumCents(payments.map((p) => p.amount)) : ZERO_CENTS;
  const balance = Math.max(consumosTotal - pagosTotal, 0);
  const ym = toYearMonth(todayIso());

  return {
    card,
    consumosTotal,
    pagosTotal,
    currentBalance: asCents(balance),
    available: asCents(Math.max(card.creditLimit - balance, 0)),
    utilization: card.creditLimit > 0 ? balance / card.creditLimit : 0,
    dueDate: nextMonthlyDate(card.paymentDueDay),
    cutoffDate: nextMonthlyDate(card.cutoffDay),
    daysUntilDue: daysUntil(nextMonthlyDate(card.paymentDueDay)),
    monthConsumo: sumCents(consumos.filter((t) => t.yearMonth === ym).map((t) => t.amount)),
    monthPago: sumCents(payments.filter((p) => toYearMonth(p.date) === ym).map((p) => p.amount)),
  };
}

export interface CardHistoryMonth {
  yearMonth: YearMonth;
  label: string;
  consumo: Cents;
  pago: Cents;
  balance: Cents;
}

/** Historial mensual de una tarjeta (consumos y pagos por mes). */
export async function cardHistoryQuery(
  cardId: CreditCardId,
  months = 6,
): Promise<CardHistoryMonth[]> {
  const [txs, payments] = await Promise.all([
    db.transactions.where('creditCardId').equals(cardId).toArray(),
    db.creditCardPayments.where('creditCardId').equals(cardId).toArray(),
  ]);

  const anchor = parseISO(`${toYearMonth(todayIso())}-01`);
  const points: CardHistoryMonth[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(anchor, -i);
    const ym = format(date, 'yyyy-MM') as YearMonth;
    const consumo = sumCents(
      txs.filter((t) => t.type === 'expense' && t.yearMonth === ym).map((t) => t.amount),
    );
    const pago = sumCents(payments.filter((p) => toYearMonth(p.date) === ym).map((p) => p.amount));
    points.push({
      yearMonth: ym,
      label: format(date, 'LLL', { locale: es }),
      consumo,
      pago,
      balance: asCents(consumo - pago),
    });
  }
  return points;
}

export interface CardMovement {
  id: string;
  kind: 'consumo' | 'pago';
  date: IsoDate;
  amount: Cents;
  description: string;
}

/** Movimientos de una tarjeta: consumos (gastos) y pagos, mezclados por fecha. */
export async function cardMovementsQuery(cardId: CreditCardId): Promise<CardMovement[]> {
  const [txs, payments] = await Promise.all([
    db.transactions.where('creditCardId').equals(cardId).toArray(),
    db.creditCardPayments.where('creditCardId').equals(cardId).toArray(),
  ]);

  const consumos: CardMovement[] = txs
    .filter((t) => t.type === 'expense')
    .map((t) => ({
      id: t.id,
      kind: 'consumo',
      date: t.date,
      amount: t.amount,
      description: t.description || 'Consumo',
    }));
  const pagos: CardMovement[] = payments.map((p) => ({
    id: p.id,
    kind: 'pago',
    date: p.date,
    amount: p.amount,
    description: 'Pago',
  }));

  return [...consumos, ...pagos].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Cobertura del fondo de emergencia en meses según el gasto medio reciente. */
export interface EmergencyFundMilestone {
  months: number;
  target: Cents;
  remaining: Cents;
  percent: number; // 0–1
  reached: boolean;
}

export interface EmergencyFundStatus {
  goal?: GoalRow;
  saved: Cents;
  averageMonthlyExpense: Cents;
  monthsCovered: number;
  /** Ventana usada para promediar el gasto (meses). */
  averageWindow: number;
  targetMonths: number[];
  milestones: EmergencyFundMilestone[];
  /** Objetivo recomendado (6 meses si está entre los objetivos, o el mayor). */
  recommended: Cents;
}

export async function emergencyFundStatusQuery(months = 3): Promise<EmergencyFundStatus> {
  const [goal, contributions, transactions, settings] = await Promise.all([
    db.goals.filter((g) => g.isEmergencyFund && !g.isArchived).first(),
    db.goalContributions.toArray(),
    db.transactions.where('type').equals('expense').toArray(),
    db.settings.get('app'),
  ]);

  const anchor = parseISO(`${toYearMonth(todayIso())}-01`);
  let totalExpense = 0;
  for (let i = 0; i < months; i += 1) {
    const ym = format(addMonths(anchor, -i), 'yyyy-MM');
    totalExpense += transactions
      .filter((t) => t.yearMonth === ym)
      .reduce((acc, t) => acc + t.amount, 0);
  }
  const averageMonthlyExpense = asCents(Math.round(totalExpense / months));

  const saved = goal
    ? asCents(
        Math.max(
          contributions.filter((c) => c.goalId === goal.id).reduce((a, c) => a + c.amount, 0),
          0,
        ),
      )
    : ZERO_CENTS;

  const monthsCovered = averageMonthlyExpense > 0 ? saved / averageMonthlyExpense : 0;

  const targetMonths = [...(settings?.emergencyFund.targetMonths ?? [3, 6, 12])].sort(
    (a, b) => a - b,
  );

  const milestones: EmergencyFundMilestone[] = targetMonths.map((m) => {
    const target = averageMonthlyExpense * m;
    return {
      months: m,
      target: asCents(target),
      remaining: asCents(Math.max(target - saved, 0)),
      percent: target > 0 ? Math.min(saved / target, 1) : 0,
      reached: target > 0 && saved >= target,
    };
  });

  const recommendedMonths = targetMonths.includes(6)
    ? 6
    : (targetMonths[targetMonths.length - 1] ?? 6);

  return {
    ...(goal ? { goal } : {}),
    saved,
    averageMonthlyExpense,
    monthsCovered,
    averageWindow: months,
    targetMonths,
    milestones,
    recommended: asCents(averageMonthlyExpense * recommendedMonths),
  };
}

// --- Presupuestos ---------------------------------------------------------

export interface BudgetStatus {
  budget: BudgetRow;
  category?: CategoryRow;
  spent: Cents;
  remaining: Cents;
  projected: Cents;
  ratio: number; // gastado / presupuesto (0–1+)
  projectedRatio: number; // proyección / presupuesto
  overBudget: boolean;
  atRisk: boolean; // la proyección supera el presupuesto
}

export interface BudgetOverview {
  yearMonth: YearMonth;
  items: BudgetStatus[];
  global?: BudgetStatus;
  totalBudget: Cents;
  totalSpent: Cents;
  totalProjected: Cents;
}

/** Días transcurridos y totales del mes, para proyectar el gasto a fin de mes. */
function monthProgress(yearMonth: YearMonth): { elapsed: number; total: number } {
  const anchor = parseISO(`${yearMonth}-01`);
  const total = getDaysInMonth(anchor);
  const current = toYearMonth(todayIso());
  if (yearMonth === current) return { elapsed: Math.max(getDate(new Date()), 1), total };
  return yearMonth < current ? { elapsed: total, total } : { elapsed: 0, total };
}

function buildStatus(
  budget: BudgetRow,
  spentAmount: number,
  category: CategoryRow | undefined,
  progress: { elapsed: number; total: number },
): BudgetStatus {
  const spent = asCents(spentAmount);
  const projectedAmount =
    progress.elapsed > 0
      ? Math.round((spentAmount / progress.elapsed) * progress.total)
      : spentAmount;
  const projected = asCents(projectedAmount);
  const ratio = budget.amount > 0 ? spentAmount / budget.amount : 0;
  const projectedRatio = budget.amount > 0 ? projectedAmount / budget.amount : 0;
  return {
    budget,
    ...(category ? { category } : {}),
    spent,
    remaining: asCents(budget.amount - spentAmount),
    projected,
    ratio,
    projectedRatio,
    overBudget: spentAmount > budget.amount,
    atRisk: projectedAmount > budget.amount,
  };
}

/**
 * Estado de los presupuestos de un mes: gastado, disponible, proyección a fin de
 * mes y alertas, derivado de los gastos reales (features.md F07).
 */
export async function budgetStatusQuery(yearMonth: YearMonth): Promise<BudgetOverview> {
  const [budgets, expenses, categories] = await Promise.all([
    db.budgets.where('yearMonth').equals(yearMonth).toArray(),
    db.transactions.where('[type+yearMonth]').equals(['expense', yearMonth]).toArray(),
    db.categories.toArray(),
  ]);

  const progress = monthProgress(yearMonth);
  const categoriesById = new Map<string, CategoryRow>(categories.map((c) => [c.id, c]));

  const spentByCategory = new Map<string, number>();
  let totalExpense = 0;
  for (const tx of expenses) {
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
    totalExpense += tx.amount;
  }

  const categoryBudgets = budgets.filter((b) => b.categoryId !== undefined);
  const globalBudget = budgets.find((b) => b.categoryId === undefined);

  const items = categoryBudgets
    .map((budget) =>
      buildStatus(
        budget,
        spentByCategory.get(budget.categoryId as string) ?? 0,
        budget.categoryId ? categoriesById.get(budget.categoryId) : undefined,
        progress,
      ),
    )
    .sort((a, b) => b.ratio - a.ratio);

  const global = globalBudget
    ? buildStatus(globalBudget, totalExpense, undefined, progress)
    : undefined;

  const totalBudget = sumCents(categoryBudgets.map((b) => b.amount));
  const totalProjected = asCents(items.reduce((acc, item) => acc + item.projected, 0));

  return {
    yearMonth,
    items,
    ...(global ? { global } : {}),
    totalBudget,
    totalSpent: asCents(sumCents(items.map((i) => i.spent))),
    totalProjected,
  };
}

// --- Metas ----------------------------------------------------------------

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

/** Ritmo de ahorro mensual observado desde el primer aporte. */
function monthlyPace(contribs: { date: IsoDate; amount: number }[], saved: number): number {
  if (contribs.length === 0 || saved <= 0) return 0;
  const firstDate = contribs.reduce((min, c) => (c.date < min ? c.date : min), contribs[0]!.date);
  const monthsElapsed = Math.max(
    differenceInCalendarMonths(new Date(), parseISO(firstDate)) + 1,
    1,
  );
  return Math.round(saved / monthsElapsed);
}

export async function goalDetailQuery(goalId: GoalId): Promise<GoalDetail | undefined> {
  const goal = await db.goals.get(goalId);
  if (!goal) return undefined;

  const contribs = await db.goalContributions.where('goalId').equals(goalId).toArray();
  const savedNet = contribs.reduce((acc, c) => acc + c.amount, 0);
  const saved = Math.max(savedNet, 0);
  const remaining = Math.max(goal.targetAmount - saved, 0);
  const percent = goal.targetAmount > 0 ? Math.min(saved / goal.targetAmount, 1) : 0;
  const reached = goal.targetAmount > 0 && saved >= goal.targetAmount;

  const monthlyAverage = monthlyPace(contribs, saved);
  const monthsToComplete = reached
    ? 0
    : monthlyAverage > 0
      ? Math.ceil(remaining / monthlyAverage)
      : null;
  const projectedDate =
    monthsToComplete !== null
      ? (format(addMonths(new Date(), monthsToComplete), 'yyyy-MM-dd') as IsoDate)
      : null;

  let requiredMonthly: number | null = null;
  let onTrack: boolean | null = null;
  if (goal.targetDate && !reached) {
    const monthsUntil = Math.max(
      differenceInCalendarMonths(parseISO(goal.targetDate), new Date()),
      1,
    );
    requiredMonthly = Math.ceil(remaining / monthsUntil);
    onTrack = monthlyAverage >= requiredMonthly;
  }

  return {
    goal,
    saved: asCents(saved),
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

export interface GoalMonthlyPoint {
  yearMonth: YearMonth;
  label: string;
  amount: Cents;
}

/** Aportes por mes de una meta (para el gráfico de barras). */
export async function goalMonthlyContribQuery(
  goalId: GoalId,
  months = 6,
): Promise<GoalMonthlyPoint[]> {
  const contribs = await db.goalContributions.where('goalId').equals(goalId).toArray();
  const anchor = parseISO(`${toYearMonth(todayIso())}-01`);
  const points: GoalMonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(anchor, -i);
    const ym = format(date, 'yyyy-MM') as YearMonth;
    const amount = sumCents(
      contribs.filter((c) => toYearMonth(c.date) === ym).map((c) => c.amount),
    );
    points.push({ yearMonth: ym, label: format(date, 'LLL', { locale: es }), amount });
  }
  return points;
}

export interface GoalProjection {
  labels: string[];
  actual: (number | null)[];
  projected: (number | null)[];
  target: number;
}

/**
 * Serie de proyección: ahorro acumulado real de los últimos meses y su
 * proyección hacia el objetivo según el ritmo actual (features.md F05/F10).
 */
export async function goalProjectionQuery(
  goalId: GoalId,
  options: { pastMonths?: number; maxFuture?: number } = {},
): Promise<GoalProjection | undefined> {
  const goal = await db.goals.get(goalId);
  if (!goal) return undefined;

  const pastMonths = options.pastMonths ?? 6;
  const maxFuture = options.maxFuture ?? 18;
  const contribs = await db.goalContributions.where('goalId').equals(goalId).toArray();

  const anchor = parseISO(`${toYearMonth(todayIso())}-01`);
  const cumNet = (ym: string) =>
    contribs.filter((c) => toYearMonth(c.date) <= ym).reduce((acc, c) => acc + c.amount, 0);

  const pastLabels: string[] = [];
  const pastValues: number[] = [];
  for (let i = pastMonths - 1; i >= 0; i -= 1) {
    const date = addMonths(anchor, -i);
    pastLabels.push(format(date, 'LLL', { locale: es }));
    pastValues.push(Math.max(cumNet(format(date, 'yyyy-MM')), 0));
  }

  const saved = Math.max(
    contribs.reduce((acc, c) => acc + c.amount, 0),
    0,
  );
  const monthlyAverage = monthlyPace(contribs, saved);
  const remaining = Math.max(goal.targetAmount - saved, 0);

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

// --- Estadísticas ---------------------------------------------------------

/** Paleta de colores para series sin color propio (p. ej. métodos de pago). */
export const CHART_PALETTE = [
  '#0d9488',
  '#6366f1',
  '#f59e0b',
  '#e11d48',
  '#0ea5e9',
  '#8b5cf6',
  '#16a34a',
  '#94a3b8',
];

function inYear(ym: string, year: number): boolean {
  return ym.slice(0, 4) === String(year);
}

export interface YearTotals {
  year: number;
  label: string;
  income: Cents;
  expense: Cents;
  balance: Cents;
}

/** Totales por año (últimos `years` años) para la comparación anual. */
export async function yearlyTotalsQuery(years = 5): Promise<YearTotals[]> {
  const transactions = await db.transactions.toArray();
  const currentYear = new Date().getFullYear();
  const result: YearTotals[] = [];
  for (let i = years - 1; i >= 0; i -= 1) {
    const year = currentYear - i;
    const yearTx = transactions.filter((t) => inYear(t.yearMonth, year));
    const income = sumCents(yearTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(yearTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    result.push({ year, label: String(year), income, expense, balance: asCents(income - expense) });
  }
  return result;
}

/** 12 meses de un año con ingresos, gastos y balance (para gráficos mensuales). */
export async function monthlyTotalsForYearQuery(year: number): Promise<TrendPoint[]> {
  const transactions = await db.transactions.toArray();
  const points: TrendPoint[] = [];
  for (let m = 0; m < 12; m += 1) {
    const date = new Date(year, m, 1);
    const ym = format(date, 'yyyy-MM') as YearMonth;
    const monthTx = transactions.filter((t) => t.yearMonth === ym);
    const income = sumCents(monthTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(monthTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    points.push({
      yearMonth: ym,
      label: format(date, 'LLL', { locale: es }),
      income,
      expense,
      balance: asCents(income - expense),
    });
  }
  return points;
}

/** Desglose por categoría de un año completo y tipo. */
export async function categoryBreakdownYearQuery(
  year: number,
  type: TransactionType = 'expense',
): Promise<CategorySlice[]> {
  const [transactions, categories] = await Promise.all([
    db.transactions.where('type').equals(type).toArray(),
    db.categories.toArray(),
  ]);

  const byCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (!inYear(tx.yearMonth, year)) continue;
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const total = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const categoriesById = new Map<string, CategoryRow>(categories.map((c) => [c.id, c]));

  return [...byCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = categoriesById.get(categoryId);
      return {
        categoryId: categoryId as CategoryId,
        name: category?.name ?? 'Sin categoría',
        color: category?.color ?? '#94a3b8',
        total: asCents(amount),
        percent: total > 0 ? amount / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MethodSlice {
  methodId: string;
  name: string;
  total: Cents;
  percent: number;
  color: string;
}

/** Desglose por método de pago de un año completo y tipo. */
export async function paymentMethodBreakdownYearQuery(
  year: number,
  type: TransactionType = 'expense',
): Promise<MethodSlice[]> {
  const [transactions, methods] = await Promise.all([
    db.transactions.where('type').equals(type).toArray(),
    db.paymentMethods.toArray(),
  ]);

  const NONE = '__none__';
  const byMethod = new Map<string, number>();
  for (const tx of transactions) {
    if (!inYear(tx.yearMonth, year)) continue;
    const key = tx.paymentMethodId ?? NONE;
    byMethod.set(key, (byMethod.get(key) ?? 0) + tx.amount);
  }

  const total = [...byMethod.values()].reduce((a, b) => a + b, 0);
  const methodsById = new Map<string, PaymentMethodRow>(methods.map((m) => [m.id, m]));

  return [...byMethod.entries()]
    .map(([methodId, amount], index) => ({
      methodId,
      name: methodId === NONE ? 'Sin método' : (methodsById.get(methodId)?.name ?? 'Método'),
      total: asCents(amount),
      percent: total > 0 ? amount / total : 0,
      color: CHART_PALETTE[index % CHART_PALETTE.length]!,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface NetWorthPoint {
  yearMonth: YearMonth;
  label: string;
  netWorth: Cents;
}

/**
 * Evolución del patrimonio: patrimonio al cierre de cada uno de los últimos
 * `months` meses (ingresos − gastos − deuda de tarjetas acumulados). Coherente
 * con `dashboardMetricsQuery`.
 */
export async function netWorthSeriesQuery(months = 12): Promise<NetWorthPoint[]> {
  const [transactions, payments] = await Promise.all([
    db.transactions.toArray(),
    db.creditCardPayments.toArray(),
  ]);

  const anchor = parseISO(`${toYearMonth(todayIso())}-01`);
  const points: NetWorthPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(anchor, -i);
    const ym = format(date, 'yyyy-MM');
    const upTo = (t: { yearMonth?: string; date?: IsoDate }) =>
      (t.yearMonth ?? toYearMonth(t.date as IsoDate)) <= ym;

    const cumIncome = sumCents(
      transactions.filter((t) => t.type === 'income' && upTo(t)).map((t) => t.amount),
    );
    const cumExpense = sumCents(
      transactions.filter((t) => t.type === 'expense' && upTo(t)).map((t) => t.amount),
    );
    const cardConsumos = sumCents(
      transactions
        .filter((t) => t.type === 'expense' && t.creditCardId !== undefined && upTo(t))
        .map((t) => t.amount),
    );
    const cardPayments = sumCents(payments.filter((p) => upTo(p)).map((p) => p.amount));
    const cardDebt = Math.max(cardConsumos - cardPayments, 0);

    points.push({
      yearMonth: ym as YearMonth,
      label: format(date, 'LLL', { locale: es }),
      netWorth: asCents(cumIncome - cumExpense - cardDebt),
    });
  }
  return points;
}
