import { describe, it, expect, beforeEach } from 'vitest';
import { createCardPayment, deleteCardPayment } from '@/services/creditCardPayments.service';
import { db } from '@/db/db';
import { resetDb, addCard, addStatement } from '@/test/seed';
import type { CreditCardStatementId } from '@/types/ids';

const statusOf = async (id: CreditCardStatementId) =>
  (await db.creditCardStatements.get(id))?.status;

describe('estado de los cortes de tarjeta', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('un corte con saldo cero se marca pagado al recibir un pago', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 0 });

    await createCardPayment({
      creditCardId: card,
      amount: 5_000,
      date: '2026-07-10',
      statementId: statement,
    });

    // Antes se quedaba en 'partial' para siempre: `statementBalance > 0` era
    // condición necesaria para llegar a 'paid'.
    expect(await statusOf(statement)).toBe('paid');
  });

  it('un corte con saldo y pago parcial queda en parcial', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 100_000 });

    await createCardPayment({
      creditCardId: card,
      amount: 30_000,
      date: '2026-07-10',
      statementId: statement,
    });

    expect(await statusOf(statement)).toBe('partial');
  });

  it('un corte se marca pagado cuando los pagos cubren el saldo', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 100_000 });

    await createCardPayment({
      creditCardId: card,
      amount: 60_000,
      date: '2026-07-10',
      statementId: statement,
    });
    await createCardPayment({
      creditCardId: card,
      amount: 40_000,
      date: '2026-07-12',
      statementId: statement,
    });

    expect(await statusOf(statement)).toBe('paid');
    expect((await db.creditCardStatements.get(statement))?.paidAmount).toBe(100_000);
  });

  it('borrar el último pago devuelve el corte a abierto', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 100_000 });

    const payment = await createCardPayment({
      creditCardId: card,
      amount: 100_000,
      date: '2026-07-10',
      statementId: statement,
    });
    expect(await statusOf(statement)).toBe('paid');

    await deleteCardPayment(payment.id);

    expect(await statusOf(statement)).toBe('open');
    expect((await db.creditCardStatements.get(statement))?.paidAmount).toBe(0);
  });

  it('un pago sobre un corte vencido lo pasa a parcial', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 100_000, status: 'overdue' });

    await createCardPayment({
      creditCardId: card,
      amount: 10_000,
      date: '2026-07-10',
      statementId: statement,
    });

    expect(await statusOf(statement)).toBe('partial');
  });

  it('un pago sin corte asociado no altera ningún corte', async () => {
    const card = await addCard('Visa');
    const statement = await addStatement(card, { statementBalance: 100_000, status: 'overdue' });

    await createCardPayment({ creditCardId: card, amount: 10_000, date: '2026-07-10' });

    expect(await statusOf(statement)).toBe('overdue');
    expect((await db.creditCardStatements.get(statement))?.paidAmount).toBe(0);
  });
});
