import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { asCents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  creditCardCreateSchema,
  creditCardUpdateSchema,
  type CreditCardCreateInput,
  type CreditCardUpdateInput,
} from '@/lib/validation/creditCards.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { CreditCardRow } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';

/**
 * CRUD de tarjetas de crédito. Las tarjetas con historial no se eliminan
 * (se archivan) para preservar movimientos y cortes (features.md F04).
 */

export function creditCardsQuery(): Promise<CreditCardRow[]> {
  return db.creditCards.filter((c) => !c.isArchived).toArray();
}

export function allCreditCardsQuery(): Promise<CreditCardRow[]> {
  return db.creditCards.toArray();
}

export async function getCreditCard(id: CreditCardId): Promise<CreditCardRow> {
  const row = await db.creditCards.get(id);
  if (!row) throw new NotFoundError('Tarjeta', id);
  return row;
}

export async function createCreditCard(input: CreditCardCreateInput): Promise<CreditCardRow> {
  const data = parseOrThrow(creditCardCreateSchema, input);
  const timestamp = nowIso();

  const row: CreditCardRow = {
    id: newId<CreditCardId>(),
    name: data.name,
    bank: data.bank,
    creditLimit: asCents(data.creditLimit),
    cutoffDay: data.cutoffDay,
    paymentDueDay: data.paymentDueDay,
    color: data.color,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.creditCards.add(row);
  return row;
}

export async function updateCreditCard(
  id: CreditCardId,
  input: CreditCardUpdateInput,
): Promise<void> {
  const data = parseOrThrow(creditCardUpdateSchema, input);
  await getCreditCard(id);

  const patch: Partial<CreditCardRow> = {
    updatedAt: nowIso(),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.bank !== undefined && { bank: data.bank }),
    ...(data.creditLimit !== undefined && { creditLimit: asCents(data.creditLimit) }),
    ...(data.cutoffDay !== undefined && { cutoffDay: data.cutoffDay }),
    ...(data.paymentDueDay !== undefined && { paymentDueDay: data.paymentDueDay }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
  };
  await db.creditCards.update(id, patch);
}

export async function archiveCreditCard(id: CreditCardId, archived = true): Promise<void> {
  await getCreditCard(id);
  await db.creditCards.update(id, { isArchived: archived, updatedAt: nowIso() });
}

/**
 * Elimina una tarjeta solo si no tiene historial (cortes, pagos ni movimientos).
 * En caso contrario sugiere archivarla.
 */
export async function deleteCreditCard(id: CreditCardId): Promise<void> {
  await getCreditCard(id);
  await db.transaction(
    'rw',
    [
      db.creditCards,
      db.creditCardStatements,
      db.creditCardPayments,
      db.transactions,
      db.paymentMethods,
    ],
    async () => {
      const statements = await db.creditCardStatements.where('creditCardId').equals(id).count();
      const payments = await db.creditCardPayments.where('creditCardId').equals(id).count();
      const movements = await db.transactions.where('creditCardId').equals(id).count();
      if (statements + payments + movements > 0) {
        throw new ConflictError(
          'La tarjeta tiene historial asociado. Archívala en lugar de eliminarla.',
        );
      }
      // Desvincula métodos de pago que apuntaran a esta tarjeta.
      await db.paymentMethods
        .where('creditCardId')
        .equals(id)
        .modify((m) => {
          delete m.creditCardId;
          m.updatedAt = nowIso();
        });
      await db.creditCards.delete(id);
    },
  );
}
