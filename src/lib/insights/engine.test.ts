import { describe, it, expect } from 'vitest';
import { runInsights } from '@/lib/insights/engine';
import { spendingTrendRule } from '@/lib/insights/rules/spendingTrend';
import { savingCapacityRule } from '@/lib/insights/rules/savingCapacity';
import { emergencyFundRule } from '@/lib/insights/rules/emergencyFund';
import { cardUtilizationRule } from '@/lib/insights/rules/cardUtilization';
import { goalsMomentumRule } from '@/lib/insights/rules/goalsMomentum';
import type { InsightContext } from '@/lib/insights/types';
import { asCents, type Cents } from '@/types/money';
import type { SettingsRow, GoalRow, CreditCardRow } from '@/db/schema';
import type { TrendPoint } from '@/services/metrics.service';

const c = (n: number): Cents => asCents(n);

const settings = {
  currency: 'USD',
  locale: 'es',
  monthlySavingsTarget: c(30_000), // $300
  emergencyFund: { targetMonths: [3, 6, 12] },
} as unknown as SettingsRow;

function trendPoint(label: string, income: number, expense: number): TrendPoint {
  return {
    yearMonth: '2026-01' as TrendPoint['yearMonth'],
    label,
    income: c(income),
    expense: c(expense),
    balance: c(income - expense),
  };
}

function baseCtx(overrides: Partial<InsightContext> = {}): InsightContext {
  return {
    settings,
    metrics: {
      yearMonth: '2026-07' as never,
      monthIncome: c(100_000),
      monthExpense: c(60_000),
      monthBalance: c(40_000),
      savingsRate: 0.4,
      totalSaved: c(0),
      available: c(0),
      cardDebt: c(0),
      netWorth: c(0),
      transactionsCount: 10,
    },
    trend: [
      trendPoint('may', 100_000, 40_000),
      trendPoint('jun', 100_000, 50_000),
      trendPoint('jul', 100_000, 30_000), // mes en curso (parcial, se ignora)
    ],
    topCategories: [],
    goals: [],
    cards: [],
    emergencyFund: {
      saved: c(0),
      averageMonthlyExpense: c(0),
      monthsCovered: 0,
      averageWindow: 3,
      targetMonths: [3, 6, 12],
      milestones: [],
      recommended: c(0),
    },
    ...overrides,
  };
}

describe('insights engine', () => {
  it('familia 1: detecta subida de gasto mes a mes (jun 25 % sobre may)', () => {
    // jun (último completo) 50.000 vs may 40.000 → +25 %.
    const insight = spendingTrendRule(baseCtx());
    expect(insight).not.toBeNull();
    expect(insight?.id).toBe('spending-up');
    expect(insight?.severity).toBe('warning');
    expect(insight?.category).toBe('spending');
  });

  it('familia 3: sugiere cuánto más ahorrar cuando el balance no llega a la meta', () => {
    const ctx = baseCtx({
      metrics: { ...baseCtx().metrics, monthBalance: c(20_000), savingsRate: 0.2 },
    });
    const insight = savingCapacityRule(ctx);
    expect(insight?.id).toBe('saving-capacity');
    expect(insight?.severity).toBe('suggestion');
    // Faltan $100 (30.000 − 20.000 = 10.000c).
    expect(insight?.title).toContain('$100');
  });

  it('familia 4: fondo de emergencia por debajo del objetivo', () => {
    const ctx = baseCtx({
      emergencyFund: {
        ...baseCtx().emergencyFund,
        goal: { id: 'g1', name: 'Fondo' } as unknown as GoalRow,
        saved: c(45_000),
        averageMonthlyExpense: c(30_000),
        monthsCovered: 1.5,
        recommended: c(180_000),
        milestones: [
          { months: 3, target: c(90_000), remaining: c(45_000), percent: 0.5, reached: false },
        ],
      },
    });
    const insight = emergencyFundRule(ctx);
    expect(insight?.id).toBe('emergency-low');
    expect(insight?.severity).toBe('warning');
    expect(insight?.title).toContain('1.5 meses');
  });

  it('familia 5: alta utilización de tarjeta', () => {
    const ctx = baseCtx({
      cards: [
        {
          card: { id: 'c1', name: 'Visa', creditLimit: c(100_000) } as unknown as CreditCardRow,
          currentBalance: c(80_000),
          utilization: 0.8,
          dueDate: '2026-07-20' as never,
          daysUntilDue: 10,
          status: 'open',
          isOverLimitWarning: true,
        },
      ],
    });
    const insight = cardUtilizationRule(ctx);
    expect(insight?.id).toBe('card-util-high');
    expect(insight?.severity).toBe('warning');
    expect(insight?.title).toContain('80');
  });

  it('familia 6: celebra meta completada y ritmo de ahorro', () => {
    const ctx = baseCtx({
      goals: [
        {
          goal: { id: 'g1', name: 'Celular', targetAmount: c(50_000) } as unknown as GoalRow,
          saved: c(50_000),
          remaining: c(0),
          percent: 1,
        },
      ],
    });
    const insights = goalsMomentumRule(ctx);
    const ids = insights.map((i) => i.id);
    expect(ids).toContain('goal-done');
    expect(ids).toContain('savings-on-track');
  });

  it('runInsights ordena por severidad (críticos primero)', () => {
    const ctx = baseCtx({
      emergencyFund: {
        ...baseCtx().emergencyFund,
        goal: { id: 'g1', name: 'Fondo' } as unknown as GoalRow,
        saved: c(10_000),
        averageMonthlyExpense: c(30_000),
        monthsCovered: 0.3, // crítico (< 1)
        recommended: c(180_000),
        milestones: [
          { months: 3, target: c(90_000), remaining: c(80_000), percent: 0.11, reached: false },
        ],
      },
    });
    const insights = runInsights(ctx);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]!.severity).toBe('critical');
    // Orden no decreciente de rango de severidad.
    const ranks = insights.map((i) => i.severity);
    const order = ['critical', 'warning', 'suggestion', 'positive', 'info'];
    const numeric = ranks.map((r) => order.indexOf(r));
    for (let i = 1; i < numeric.length; i += 1) {
      expect(numeric[i]!).toBeGreaterThanOrEqual(numeric[i - 1]!);
    }
  });
});
