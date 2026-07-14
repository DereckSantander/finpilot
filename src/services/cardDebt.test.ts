import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dashboardMetricsQuery, cardsSummaryQuery } from '@/services/metrics.service';
import { createTransaction, updateTransaction } from '@/services/transactions.service';
import { db } from '@/db/db';
import {
  resetDb,
  addCard,
  addCardPayment,
  addPaymentMethod,
  EXPENSE_CAT,
  INCOME_CAT,
} from '@/test/seed';
import type { YearMonth } from '@/types/common';

const ym = (s: string): YearMonth => s as YearMonth;

/**
 * Coherencia de la deuda de tarjeta: un gasto pagado con un método vinculado a
 * una tarjeta debe generar deuda venga de donde venga, y el KPI del dashboard
 * debe coincidir siempre con la suma del listado de tarjetas.
 */
describe('deuda de tarjeta', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    await resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('un gasto con método vinculado a tarjeta se registra como consumo de esa tarjeta', async () => {
    const card = await addCard('Visa');
    const method = await addPaymentMethod('Visa', { type: 'credit', creditCardId: card });

    const tx = await createTransaction({
      type: 'expense',
      amount: 50_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });

    expect(tx.creditCardId).toBe(card);
    const metrics = await dashboardMetricsQuery(ym('2026-07'));
    expect(metrics.cardDebt).toBe(50_000);
  });

  it('cambiar el método a efectivo desvincula la tarjeta y elimina la deuda', async () => {
    const card = await addCard('Visa');
    const credit = await addPaymentMethod('Visa', { type: 'credit', creditCardId: card });
    const cash = await addPaymentMethod('Efectivo');

    const tx = await createTransaction({
      type: 'expense',
      amount: 50_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: credit,
      description: 'Súper',
      tags: [],
    });
    expect((await dashboardMetricsQuery(ym('2026-07'))).cardDebt).toBe(50_000);

    await updateTransaction(tx.id, { paymentMethodId: cash });

    const updated = await db.transactions.get(tx.id);
    expect(updated?.creditCardId).toBeUndefined();
    expect(updated?.paymentMethodId).toBe(cash);
    expect((await dashboardMetricsQuery(ym('2026-07'))).cardDebt).toBe(0);
  });

  it('quitar el método de pago (null) también quita la tarjeta', async () => {
    const card = await addCard('Visa');
    const credit = await addPaymentMethod('Visa', { type: 'credit', creditCardId: card });

    const tx = await createTransaction({
      type: 'expense',
      amount: 20_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: credit,
      description: 'Súper',
      tags: [],
    });

    await updateTransaction(tx.id, { paymentMethodId: null });

    const updated = await db.transactions.get(tx.id);
    expect(updated?.paymentMethodId).toBeUndefined();
    expect(updated?.creditCardId).toBeUndefined();
    expect((await dashboardMetricsQuery(ym('2026-07'))).cardDebt).toBe(0);
  });

  it('la deuda del dashboard es la suma por tarjeta, aunque una esté sobrepagada', async () => {
    const visa = await addCard('Visa');
    const amex = await addCard('Amex');

    await createTransaction({
      type: 'expense',
      amount: 100_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      creditCardId: visa,
      description: 'Consumo Visa',
      tags: [],
    });
    await createTransaction({
      type: 'expense',
      amount: 10_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      creditCardId: amex,
      description: 'Consumo Amex',
      tags: [],
    });
    // La Amex queda sobrepagada en 40.000: ese excedente no debe cancelar la
    // deuda de la Visa.
    await addCardPayment(amex, 50_000, '2026-07-10');

    const metrics = await dashboardMetricsQuery(ym('2026-07'));
    const cards = await cardsSummaryQuery();
    const sumOfCards = cards.reduce((acc, c) => acc + c.currentBalance, 0);

    expect(metrics.cardDebt).toBe(100_000);
    expect(sumOfCards).toBe(metrics.cardDebt);
  });

  it('una tarjeta archivada con deuda sigue apareciendo y cuadrando con el dashboard', async () => {
    const card = await addCard('Vieja', { isArchived: true });
    await createTransaction({
      type: 'expense',
      amount: 70_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      creditCardId: card,
      description: 'Consumo',
      tags: [],
    });

    const metrics = await dashboardMetricsQuery(ym('2026-07'));
    const cards = await cardsSummaryQuery();

    expect(metrics.cardDebt).toBe(70_000);
    expect(cards.map((c) => c.card.id)).toContain(card);
    expect(cards.reduce((acc, c) => acc + c.currentBalance, 0)).toBe(metrics.cardDebt);
  });

  it('el día de pago 30 no se recorta al 28', async () => {
    await addCard('Visa', { paymentDueDay: 30, cutoffDay: 31 });

    const [summary] = await cardsSummaryQuery();
    // Hoy es 15-07-2026: el próximo vencimiento es el 30 de julio.
    expect(summary?.dueDate).toBe('2026-07-30');
  });

  it('un ingreso nunca queda ligado a una tarjeta', async () => {
    const card = await addCard('Visa');
    const credit = await addPaymentMethod('Visa', { type: 'credit', creditCardId: card });

    const tx = await createTransaction({
      type: 'income',
      amount: 10_000,
      date: '2026-07-05',
      categoryId: INCOME_CAT,
      paymentMethodId: credit,
      description: 'Reembolso',
      tags: [],
    });

    expect(tx.creditCardId).toBeUndefined();
    expect((await dashboardMetricsQuery(ym('2026-07'))).cardDebt).toBe(0);
  });
});
