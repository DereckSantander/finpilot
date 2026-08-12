import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadLedger } from '@/services/ledger/load';
import { insightsQuery } from '@/services/insights.service';
import {
  dashboardMetricsQuery,
  cardsSummaryQuery,
  cardDetailQuery,
  goalsProgressQuery,
} from '@/services/metrics.service';
import { createTransaction } from '@/services/transactions.service';
import { db } from '@/db/db';
import {
  resetDb,
  addCard,
  addCardPayment,
  addGoal,
  addContribution,
  EXPENSE_CAT,
  INCOME_CAT,
} from '@/test/seed';
import { freezeTime, unfreezeTime } from '@/test/time';
import type { YearMonth } from '@/types/common';

const JULY = '2026-07' as YearMonth;

describe('Ledger', () => {
  beforeEach(async () => {
    freezeTime('2026-07-15T12:00:00.000Z');
    await resetDb();
  });

  afterEach(unfreezeTime);

  it('lee cada tabla primaria una sola vez por consulta de insights', async () => {
    const txSpy = vi.spyOn(db.transactions, 'toArray');
    const paySpy = vi.spyOn(db.creditCardPayments, 'toArray');

    await insightsQuery();

    // Antes: `insightsQuery` lanzaba seis consultas y cada una releía la base
    // por su cuenta (3–4 lecturas de movimientos, 2–3 de pagos).
    expect(txSpy).toHaveBeenCalledTimes(1);
    expect(paySpy).toHaveBeenCalledTimes(1);

    txSpy.mockRestore();
    paySpy.mockRestore();
  });

  it('los ámbitos no alteran el resultado, solo las tablas leídas', async () => {
    const card = await addCard('Visa');
    await createTransaction({
      type: 'expense',
      amount: 50_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      creditCardId: card,
      description: 'Consumo',
      tags: [],
    });
    const goal = await addGoal('Viaje', 500_000);
    await addContribution(goal, 80_000, '2026-07-01');

    const full = await loadLedger();
    const scoped = await loadLedger(['cards']);

    // Un ledger acotado ve exactamente los mismos saldos de tarjeta que el completo.
    expect([...scoped.index.cardBalances.entries()]).toEqual([
      ...full.index.cardBalances.entries(),
    ]);
    // …y no carga las tablas que no pidió.
    expect(scoped.goals).toEqual([]);
    expect(full.goals).toHaveLength(1);
  });

  it('el saldo de una tarjeta es el mismo en el detalle, el listado y el dashboard', async () => {
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
    // La Amex queda sobrepagada: es el caso donde las cuatro implementaciones
    // anteriores podían divergir.
    await addCardPayment(amex, 50_000, '2026-07-10');

    const metrics = await dashboardMetricsQuery(JULY);
    const summaries = await cardsSummaryQuery();
    const visaDetail = await cardDetailQuery(visa);
    const amexDetail = await cardDetailQuery(amex);

    const summaryOf = (id: string) => summaries.find((c) => c.card.id === id)?.currentBalance;

    expect(visaDetail?.currentBalance).toBe(summaryOf(visa));
    expect(amexDetail?.currentBalance).toBe(summaryOf(amex));
    expect(amexDetail?.currentBalance).toBe(0);
    expect(metrics.cardDebt).toBe(100_000);
    expect(summaries.reduce((acc, c) => acc + c.currentBalance, 0)).toBe(metrics.cardDebt);
  });

  it('archivar una meta financiada no descuadra el ahorro entre pantallas', async () => {
    const active = await addGoal('Viaje', 500_000);
    const archived = await addGoal('Coche', 800_000);
    await addContribution(active, 120_000, '2026-07-01');
    await addContribution(archived, 300_000, '2026-06-01');
    await createTransaction({
      type: 'income',
      amount: 1_000_000,
      date: '2026-07-01',
      categoryId: INCOME_CAT,
      description: 'Sueldo',
      tags: [],
    });

    const before = await dashboardMetricsQuery(JULY);
    expect(before.totalSaved).toBe(420_000);
    expect(before.activeSaved).toBe(420_000);

    await db.goals.update(archived, { isArchived: true });

    const after = await dashboardMetricsQuery(JULY);
    const progress = await goalsProgressQuery();
    const shownInGoalsPage = progress.reduce((acc, g) => acc + g.saved, 0);

    // `totalSaved` sigue contando la meta archivada: ese dinero salió de la caja
    // y debe seguir restando de "disponible".
    expect(after.totalSaved).toBe(420_000);
    expect(after.available).toBe(before.available);

    // `activeSaved` es lo que suma la pantalla de Metas. Antes ambas cifras
    // compartían la etiqueta "Total ahorrado" y discrepaban en 300.000.
    expect(after.activeSaved).toBe(120_000);
    expect(shownInGoalsPage).toBe(after.activeSaved);
  });
});
