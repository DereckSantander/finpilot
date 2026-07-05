import { describe, it, expect, beforeEach } from 'vitest';
import { createCreditCard, deleteCreditCard } from '@/services/creditCards.service';
import { createTransaction } from '@/services/transactions.service';
import { db } from '@/db/db';
import { resetDb, EXPENSE_CAT } from '@/test/seed';
import { ConflictError } from '@/lib/errors';
import type { PaymentMethodRow } from '@/db/schema';
import type { CreditCardId, PaymentMethodId } from '@/types/ids';
import type { IsoDateTime } from '@/types/common';

const NOW = '2026-01-01T00:00:00.000Z' as IsoDateTime;

async function makeCard() {
  return createCreditCard({
    name: 'Visa',
    bank: 'Banco',
    creditLimit: 300_000,
    cutoffDay: 5,
    paymentDueDay: 20,
    color: '#0d9488',
  });
}

describe('creditCards.service · borrado', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('elimina una tarjeta sin historial y desvincula su método de pago', async () => {
    const card = await makeCard();

    // Método de pago que apunta a la tarjeta (creditCardId NO está indexado:
    // regresión histórica que hacía fallar el borrado con "is not indexed").
    const method: PaymentMethodRow = {
      id: 'pm-1' as PaymentMethodId,
      name: 'Tarjeta Visa',
      type: 'credit',
      creditCardId: card.id,
      isArchived: false,
      createdAt: NOW,
      updatedAt: NOW,
    };
    await db.paymentMethods.add(method);

    await expect(deleteCreditCard(card.id as CreditCardId)).resolves.toBeUndefined();

    expect(await db.creditCards.get(card.id)).toBeUndefined();
    const unlinked = await db.paymentMethods.get('pm-1');
    expect(unlinked?.creditCardId).toBeUndefined();
  });

  it('bloquea el borrado si la tarjeta tiene movimientos (sugiere archivar)', async () => {
    const card = await makeCard();
    await createTransaction({
      type: 'expense',
      amount: 5_000,
      date: '2026-07-05',
      categoryId: EXPENSE_CAT,
      description: 'Consumo',
      tags: [],
      creditCardId: card.id,
    });

    await expect(deleteCreditCard(card.id as CreditCardId)).rejects.toBeInstanceOf(ConflictError);
    expect(await db.creditCards.get(card.id)).toBeDefined();
  });
});
