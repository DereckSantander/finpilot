import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dashboardMetricsQuery,
  categoryBreakdownQuery,
  monthlyTrendQuery,
  goalsProgressQuery,
  budgetStatusQuery,
  emergencyFundStatusQuery,
} from '@/services/metrics.service';
import { createTransaction } from '@/services/transactions.service';
import { db } from '@/db/db';
import { resetDb, addGoal, addContribution, addBudget, EXPENSE_CAT, INCOME_CAT } from '@/test/seed';
import { asCents } from '@/types/money';
import type { CreditCardPaymentRow } from '@/db/schema';
import type { CreditCardPaymentId, CreditCardId } from '@/types/ids';
import type { YearMonth } from '@/types/common';

/** Cast de conveniencia para meses en las pruebas. */
const ym = (s: string): YearMonth => s as YearMonth;

/** Alta de movimiento por el camino real del servicio. */
function addTx(type: 'income' | 'expense', amount: number, date: string, categoryId = EXPENSE_CAT) {
  return createTransaction({
    type,
    amount,
    date,
    categoryId,
    description: `${type} ${date}`,
    tags: [],
  });
}

describe('metrics.service', () => {
  beforeEach(async () => {
    // Falseamos SOLO `Date` (no setTimeout/setImmediate, que fake-indexeddb usa
    // internamente y colgaría a Dexie). Así "hoy" es determinista.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    await resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dashboardMetricsQuery calcula ingresos, gastos, ahorro y patrimonio del mes', async () => {
    await addTx('income', 100_000, '2026-03-10', INCOME_CAT);
    await addTx('expense', 40_000, '2026-03-12', EXPENSE_CAT);
    await addContribution(await addGoal('Carro', 500_000), 20_000, '2026-03-15');

    const m = await dashboardMetricsQuery(ym('2026-03'));
    expect(m.monthIncome).toBe(100_000);
    expect(m.monthExpense).toBe(40_000);
    expect(m.monthBalance).toBe(60_000);
    expect(m.savingsRate).toBeCloseTo(0.6, 10);
    expect(m.totalSaved).toBe(20_000);
    // disponible = ingresos − gastos − ahorrado = 100.000 − 40.000 − 20.000
    expect(m.available).toBe(40_000);
    // patrimonio = disponible + ahorrado − deuda
    expect(m.netWorth).toBe(60_000);
    expect(m.transactionsCount).toBe(2);
  });

  it('dashboardMetricsQuery descuenta la deuda de tarjeta (consumos − pagos)', async () => {
    const card = 'card-1' as CreditCardId;
    await createTransaction({
      type: 'expense',
      amount: 50_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      description: 'Consumo tarjeta',
      tags: [],
      creditCardId: card,
    }).catch(async () => {
      // createTransaction valida que la tarjeta exista; la insertamos y reintentamos.
      await db.creditCards.add({
        id: card,
        name: 'Visa',
        bank: 'Banco',
        creditLimit: asCents(200_000),
        cutoffDay: 5,
        paymentDueDay: 20,
        color: '#000',
        isArchived: false,
        createdAt: '2026-01-01T00:00:00.000Z' as never,
        updatedAt: '2026-01-01T00:00:00.000Z' as never,
      });
      await createTransaction({
        type: 'expense',
        amount: 50_000,
        date: '2026-07-05',
        categoryId: EXPENSE_CAT,
        description: 'Consumo tarjeta',
        tags: [],
        creditCardId: card,
      });
    });

    const payment: CreditCardPaymentRow = {
      id: 'pay-1' as CreditCardPaymentId,
      creditCardId: card,
      amount: asCents(20_000),
      date: '2026-07-10' as never,
      createdAt: '2026-07-10T00:00:00.000Z' as never,
    };
    await db.creditCardPayments.add(payment);

    const m = await dashboardMetricsQuery(ym('2026-07'));
    expect(m.cardDebt).toBe(30_000); // 50.000 − 20.000
  });

  it('no descuenta el consumo con tarjeta dos veces en el patrimonio', async () => {
    const card = 'card-nw' as CreditCardId;
    await db.creditCards.add({
      id: card,
      name: 'Visa',
      bank: 'Banco',
      creditLimit: asCents(200_000),
      cutoffDay: 5,
      paymentDueDay: 20,
      color: '#000',
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z' as never,
      updatedAt: '2026-01-01T00:00:00.000Z' as never,
    });
    await addTx('income', 100_000, '2026-07-01', INCOME_CAT);
    await addTx('expense', 20_000, '2026-07-02', EXPENSE_CAT); // gasto en efectivo
    await createTransaction({
      type: 'expense',
      amount: 30_000,
      date: '2026-07-03',
      categoryId: EXPENSE_CAT,
      description: 'Consumo tarjeta (sin pagar)',
      tags: [],
      creditCardId: card,
    });

    const before = await dashboardMetricsQuery(ym('2026-07'));
    // Efectivo: solo salieron los 20.000 en efectivo (el consumo aún no se paga).
    expect(before.available).toBe(80_000);
    expect(before.cardDebt).toBe(30_000);
    // Patrimonio = efectivo − deuda = 80.000 − 30.000 = 50.000 (= ingresos − gastos).
    expect(before.netWorth).toBe(50_000);

    // Pagar la tarjeta reduce el efectivo y la deuda, pero NO cambia el patrimonio.
    await db.creditCardPayments.add({
      id: 'pay-nw' as never,
      creditCardId: card,
      amount: asCents(30_000),
      date: '2026-07-10' as never,
      createdAt: '2026-07-10T00:00:00.000Z' as never,
    });
    const after = await dashboardMetricsQuery(ym('2026-07'));
    expect(after.available).toBe(50_000);
    expect(after.cardDebt).toBe(0);
    expect(after.netWorth).toBe(50_000);
  });

  it('categoryBreakdownQuery agrega gastos por categoría con su porcentaje', async () => {
    await addTx('expense', 30_000, '2026-03-02', EXPENSE_CAT);
    await addTx('expense', 10_000, '2026-03-03', EXPENSE_CAT);

    const slices = await categoryBreakdownQuery(ym('2026-03'), 'expense');
    expect(slices).toHaveLength(1);
    expect(slices[0]?.total).toBe(40_000);
    expect(slices[0]?.percent).toBeCloseTo(1, 10);
  });

  it('monthlyTrendQuery devuelve la serie de los últimos meses', async () => {
    await addTx('income', 100_000, '2026-03-10', INCOME_CAT);
    await addTx('expense', 40_000, '2026-03-12', EXPENSE_CAT);

    const trend = await monthlyTrendQuery(ym('2026-03'), 3);
    expect(trend).toHaveLength(3); // ene, feb, mar
    const march = trend.at(-1)!;
    expect(march.income).toBe(100_000);
    expect(march.expense).toBe(40_000);
    expect(march.balance).toBe(60_000);
  });

  it('goalsProgressQuery calcula ahorrado, restante y porcentaje', async () => {
    const goal = await addGoal('Carro', 200_000);
    await addContribution(goal, 160_000, '2026-02-01');

    const [progress] = await goalsProgressQuery();
    expect(progress?.saved).toBe(160_000);
    expect(progress?.remaining).toBe(40_000);
    expect(progress?.percent).toBeCloseTo(0.8, 10);
  });

  it('budgetStatusQuery marca gastado, disponible y sobregiro (mes pasado)', async () => {
    // 2026-03 es un mes ya cerrado respecto a "hoy" (2026-07-15): proyección = gastado.
    await addBudget('2026-03', 50_000, EXPENSE_CAT);
    await addTx('expense', 40_000, '2026-03-05', EXPENSE_CAT);

    const overview = await budgetStatusQuery(ym('2026-03'));
    const item = overview.items[0]!;
    expect(item.spent).toBe(40_000);
    expect(item.remaining).toBe(10_000);
    expect(item.projected).toBe(40_000);
    expect(item.overBudget).toBe(false);
    expect(item.ratio).toBeCloseTo(0.8, 10);
  });

  it('emergencyFundStatusQuery promedia meses completos e ignora el mes en curso', async () => {
    // Hoy = 2026-07-15. Los 3 meses completos son abr, may y jun: 30.000/mes.
    // El gasto de julio (mes en curso, parcial) NO debe alterar el promedio.
    await addTx('expense', 30_000, '2026-04-10', EXPENSE_CAT);
    await addTx('expense', 30_000, '2026-05-10', EXPENSE_CAT);
    await addTx('expense', 30_000, '2026-06-10', EXPENSE_CAT);
    await addTx('expense', 5_000, '2026-07-02', EXPENSE_CAT);
    const fund = await addGoal('Fondo', 0, { isEmergencyFund: true });
    await addContribution(fund, 45_000, '2026-07-01');

    const ef = await emergencyFundStatusQuery(3);
    expect(ef.averageMonthlyExpense).toBe(30_000);
    expect(ef.saved).toBe(45_000);
    expect(ef.monthsCovered).toBeCloseTo(1.5, 10);
    const milestone3 = ef.milestones.find((m) => m.months === 3)!;
    expect(milestone3.target).toBe(90_000);
    expect(milestone3.percent).toBeCloseTo(0.5, 10);
    expect(milestone3.reached).toBe(false);
  });

  it('emergencyFundStatusQuery prorratea el mes en curso si no hay historia', async () => {
    // Sin meses completos, el promedio sale de anualizar el mes en curso: a día
    // 15 de julio (31 días), 15.000 gastados ⇒ 31.000 proyectados al mes.
    await addTx('expense', 15_000, '2026-07-05', EXPENSE_CAT);

    const ef = await emergencyFundStatusQuery(3);
    expect(ef.averageMonthlyExpense).toBe(31_000);
  });
});
