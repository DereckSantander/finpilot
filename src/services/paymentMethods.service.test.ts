import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updatePaymentMethod } from '@/services/paymentMethods.service';
import { createTransaction } from '@/services/transactions.service';
import { dashboardMetricsQuery, cardsSummaryQuery } from '@/services/metrics.service';
import { db } from '@/db/db';
import { resetDb, addCard, addPaymentMethod, EXPENSE_CAT } from '@/test/seed';
import { freezeTime, unfreezeTime } from '@/test/time';
import type { YearMonth } from '@/types/common';

const JULY = '2026-07' as YearMonth;

/** El KPI del dashboard nunca puede discrepar de la suma del listado de tarjetas. */
async function expectDebtCoherence(expected: number): Promise<void> {
  const metrics = await dashboardMetricsQuery(JULY);
  const cards = await cardsSummaryQuery();
  const sumOfCards = cards.reduce((acc, c) => acc + c.currentBalance, 0);
  expect(metrics.cardDebt).toBe(expected);
  expect(sumOfCards).toBe(metrics.cardDebt);
}

/**
 * El `creditCardId` de cada movimiento es una copia denormalizada de la tarjeta
 * del método de pago. Si el método cambia de tarjeta o deja de ser de crédito,
 * esa copia tiene que seguirle el paso o la deuda histórica queda falseada.
 */
describe('resincronización de métodos de pago', () => {
  beforeEach(async () => {
    freezeTime('2026-07-15T12:00:00.000Z');
    await resetDb();
  });

  afterEach(unfreezeTime);

  it('vincular un método a una tarjeta arrastra sus movimientos previos', async () => {
    const card = await addCard('Visa');
    const method = await addPaymentMethod('Tarjeta', { type: 'credit' });

    await createTransaction({
      type: 'expense',
      amount: 40_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });
    await expectDebtCoherence(0); // aún sin tarjeta vinculada

    await updatePaymentMethod(method, { creditCardId: card });

    await expectDebtCoherence(40_000);
  });

  it('reapuntar el método a otra tarjeta mueve la deuda histórica', async () => {
    const visa = await addCard('Visa');
    const amex = await addCard('Amex');
    const method = await addPaymentMethod('Tarjeta', { type: 'credit', creditCardId: visa });

    await createTransaction({
      type: 'expense',
      amount: 60_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });

    await updatePaymentMethod(method, { creditCardId: amex });

    const cards = await cardsSummaryQuery();
    expect(cards.find((c) => c.card.id === visa)?.currentBalance).toBe(0);
    expect(cards.find((c) => c.card.id === amex)?.currentBalance).toBe(60_000);
    await expectDebtCoherence(60_000);
  });

  it('cambiar el tipo de crédito a débito elimina la deuda', async () => {
    const card = await addCard('Visa');
    const method = await addPaymentMethod('Tarjeta', { type: 'credit', creditCardId: card });

    await createTransaction({
      type: 'expense',
      amount: 25_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });
    await expectDebtCoherence(25_000);

    await updatePaymentMethod(method, { type: 'debit' });

    await expectDebtCoherence(0);
  });

  it('desvincular la tarjeta (null) elimina la deuda', async () => {
    const card = await addCard('Visa');
    const method = await addPaymentMethod('Tarjeta', { type: 'credit', creditCardId: card });

    await createTransaction({
      type: 'expense',
      amount: 15_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });

    await updatePaymentMethod(method, { creditCardId: null });

    expect((await db.paymentMethods.get(method))?.creditCardId).toBeUndefined();
    await expectDebtCoherence(0);
  });

  it('renombrar el método no toca el historial', async () => {
    const card = await addCard('Visa');
    const method = await addPaymentMethod('Tarjeta', { type: 'credit', creditCardId: card });

    const tx = await createTransaction({
      type: 'expense',
      amount: 12_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      paymentMethodId: method,
      description: 'Súper',
      tags: [],
    });

    await updatePaymentMethod(method, { name: 'Visa Oro' });

    expect((await db.transactions.get(tx.id))?.creditCardId).toBe(card);
    await expectDebtCoherence(12_000);
  });
});
