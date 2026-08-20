import { describe, it, expect } from 'vitest';
import { buildKpiExplanations } from '@/features/dashboard/lib/kpiExplain';
import type { KpiExplanation } from '@/features/dashboard/lib/kpiExplain';
import type {
  CardSummary,
  DashboardMetrics,
  EmergencyFundStatus,
} from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import { asCents, type Cents } from '@/types/money';

const c = (value: number) => asCents(value);

const settings = {
  currency: 'USD',
  locale: 'es',
  emergencyFund: { targetMonths: [3, 6, 12] },
} as unknown as SettingsRow;

/** Escenario: $1.000 de ingresos, $200 en efectivo y $300 con tarjeta (sin pagar). */
const metrics: DashboardMetrics = {
  yearMonth: '2026-07' as DashboardMetrics['yearMonth'],
  monthIncome: c(100_000),
  monthExpense: c(50_000),
  monthBalance: c(50_000),
  savingsRate: 0.5,
  totalSaved: c(10_000),
  activeSaved: c(6_000),
  available: c(70_000),
  cardDebt: c(30_000),
  netWorth: c(50_000),
  transactionsCount: 3,
  components: {
    lifetimeIncome: c(100_000),
    lifetimeExpense: c(50_000),
    cardConsumos: c(30_000),
    nonCardExpense: c(20_000),
    cardPayments: c(0),
  },
};

const emergencyFund: EmergencyFundStatus = {
  saved: c(60_000),
  averageMonthlyExpense: c(20_000),
  monthsCovered: 3,
  averageWindow: 3,
  targetMonths: [3, 6, 12],
  milestones: [],
  recommended: c(120_000),
};

const cards: CardSummary[] = [
  {
    card: { name: 'Visa', creditLimit: c(100_000) },
    currentBalance: c(30_000),
    utilization: 0.3,
  } as CardSummary,
  {
    card: { name: 'Amex', creditLimit: c(100_000) },
    currentBalance: c(10_000),
    utilization: 0.1,
  } as CardSummary,
];

function explanations() {
  return buildKpiExplanations({
    metrics,
    emergencyFund,
    cards,
    settings,
    money: (value: Cents) => `$${(value / 100).toFixed(2)}`,
  });
}

/** Aplica los operadores de las filas para reconstruir el resultado. */
function evaluate(explanation: KpiExplanation): number {
  let acc = 0;
  for (const row of explanation.rows) {
    if (row.total || row.amount === undefined) continue;
    acc += row.op === '−' ? -row.amount : row.amount;
  }
  return acc;
}

function total(explanation: KpiExplanation) {
  return explanation.rows.find((r) => r.total);
}

describe('buildKpiExplanations', () => {
  it('el desglose del patrimonio reproduce la cifra del KPI', () => {
    const netWorth = explanations().netWorth;
    expect(evaluate(netWorth)).toBe(metrics.netWorth);
    expect(total(netWorth)?.amount).toBe(metrics.netWorth);
  });

  it('el desglose del dinero disponible reproduce la cifra del KPI', () => {
    const available = explanations().available;
    expect(evaluate(available)).toBe(metrics.available);
    expect(total(available)?.amount).toBe(metrics.available);
  });

  it('separa el ahorro de metas activas del de archivadas', () => {
    const rows = explanations().totalSaved.rows;
    expect(rows[0]?.amount).toBe(metrics.activeSaved);
    expect(rows[1]?.amount).toBe(4_000); // 10.000 − 6.000 archivadas
    expect(total(explanations().totalSaved)?.amount).toBe(metrics.totalSaved);
  });

  it('explica que el consumo con tarjeta no resta del disponible', () => {
    const notes = explanations().available.notes ?? [];
    expect(notes.some((n) => n.includes('$300.00'))).toBe(true);
  });

  it('el balance del mes cuadra con ingresos − gastos', () => {
    const balance = explanations().monthBalance;
    expect(evaluate(balance)).toBe(metrics.monthBalance);
  });

  it('lista una fila por tarjeta y la media de utilización', () => {
    const utilization = explanations().cardUtilization;
    expect(utilization.rows).toHaveLength(3); // 2 tarjetas + total
    expect(total(utilization)?.text).toContain('20');
  });

  it('sin tarjetas, la utilización media se muestra vacía', () => {
    const withoutCards = buildKpiExplanations({
      metrics,
      emergencyFund,
      cards: [],
      settings,
      money: (value: Cents) => `$${(value / 100).toFixed(2)}`,
    });
    expect(total(withoutCards.cardUtilization)?.text).toBe('—');
  });

  it('sin ingresos en el mes no se inventa una tasa de ahorro', () => {
    const noIncome = buildKpiExplanations({
      metrics: { ...metrics, monthIncome: c(0), savingsRate: 0 },
      emergencyFund,
      cards,
      settings,
      money: (value: Cents) => `$${(value / 100).toFixed(2)}`,
    });
    expect(total(noIncome.savingsRate)?.text).toBe('—');
  });
});
