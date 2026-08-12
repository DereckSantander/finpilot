import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  type PaymentMethodCreateInput,
  type PaymentMethodUpdateInput,
} from '@/lib/validation/catalog.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { PaymentMethodRow } from '@/db/schema';
import type { PaymentMethodId, CreditCardId } from '@/types/ids';

/** CRUD de métodos de pago. */

export function paymentMethodsQuery(): Promise<PaymentMethodRow[]> {
  return db.paymentMethods.filter((m) => !m.isArchived).toArray();
}

export function allPaymentMethodsQuery(): Promise<PaymentMethodRow[]> {
  return db.paymentMethods.toArray();
}

export async function getPaymentMethod(id: PaymentMethodId): Promise<PaymentMethodRow> {
  const row = await db.paymentMethods.get(id);
  if (!row) throw new NotFoundError('Método de pago', id);
  return row;
}

export async function createPaymentMethod(
  input: PaymentMethodCreateInput,
): Promise<PaymentMethodRow> {
  const data = parseOrThrow(paymentMethodCreateSchema, input);
  const timestamp = nowIso();

  const row: PaymentMethodRow = {
    id: newId<PaymentMethodId>(),
    name: data.name,
    type: data.type,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(data.creditCardId !== undefined && {
      creditCardId: data.creditCardId as CreditCardId,
    }),
  };

  await db.paymentMethods.add(row);
  return row;
}

/**
 * Resincroniza el `creditCardId` denormalizado de los movimientos de un método
 * tras cambiar su tarjeta o su tipo. El campo se copia en cada movimiento al
 * crearlo (transactions.service: `cardOfMethod`) por rendimiento; esta función
 * es lo que impide que esa copia se vuelva mentira cuando el método cambia.
 * Los ingresos nunca quedan ligados a una tarjeta.
 */
async function resyncTransactionsOfMethod(
  methodId: PaymentMethodId,
  card: CreditCardId | undefined,
): Promise<void> {
  await db.transactions
    .where('paymentMethodId')
    .equals(methodId)
    .modify((tx) => {
      const next = tx.type === 'expense' ? card : undefined;
      if (next === undefined) delete tx.creditCardId;
      else tx.creditCardId = next;
      tx.updatedAt = nowIso();
    });
}

export async function updatePaymentMethod(
  id: PaymentMethodId,
  input: PaymentMethodUpdateInput,
): Promise<void> {
  const data = parseOrThrow(paymentMethodUpdateSchema, input);
  const current = await getPaymentMethod(id);

  const patch: Partial<PaymentMethodRow> = {
    updatedAt: nowIso(),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
  };

  // Solo un cambio de tarjeta o de tipo puede alterar a qué tarjeta pertenecen
  // los movimientos; renombrar o archivar no toca el historial.
  const cardChanged = data.creditCardId !== undefined;
  const typeChanged = data.type !== undefined && data.type !== current.type;
  const nextType = data.type ?? current.type;
  const nextCardId = cardChanged
    ? ((data.creditCardId as CreditCardId | null) ?? undefined)
    : current.creditCardId;
  // Un método que deja de ser de crédito no puede seguir generando deuda.
  const effectiveCard = nextType === 'credit' ? nextCardId : undefined;

  await db.transaction('rw', db.paymentMethods, db.transactions, async () => {
    await db.paymentMethods
      .where('id')
      .equals(id)
      .modify((method) => {
        Object.assign(method, patch);
        if (data.creditCardId !== undefined) {
          if (data.creditCardId === null) delete method.creditCardId;
          else method.creditCardId = data.creditCardId as CreditCardId;
        }
      });

    if (cardChanged || typeChanged) {
      await resyncTransactionsOfMethod(id, effectiveCard);
    }
  });
}

export async function archivePaymentMethod(id: PaymentMethodId, archived = true): Promise<void> {
  await getPaymentMethod(id);
  await db.paymentMethods.update(id, { isArchived: archived, updatedAt: nowIso() });
}

export function countPaymentMethodUsage(id: PaymentMethodId): Promise<number> {
  return db.transactions.where('paymentMethodId').equals(id).count();
}

/**
 * Elimina un método de pago. Si está en uso, por defecto se bloquea; con
 * `detachTransactions` se desvincula de los movimientos (quedan sin método).
 */
export async function deletePaymentMethod(
  id: PaymentMethodId,
  options: { detachTransactions?: boolean } = {},
): Promise<void> {
  await getPaymentMethod(id);
  await db.transaction('rw', db.transactions, db.paymentMethods, async () => {
    const usage = await db.transactions.where('paymentMethodId').equals(id).count();
    if (usage > 0) {
      if (!options.detachTransactions) {
        throw new ConflictError(`El método de pago está en uso por ${usage} movimiento(s).`);
      }
      await db.transactions
        .where('paymentMethodId')
        .equals(id)
        .modify((tx) => {
          delete tx.paymentMethodId;
          tx.updatedAt = nowIso();
        });
    }
    await db.paymentMethods.delete(id);
  });
}
