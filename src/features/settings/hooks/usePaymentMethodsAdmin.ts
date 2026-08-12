import { useLiveQuery } from 'dexie-react-hooks';
import { allPaymentMethodsQuery, countPaymentMethodUsage } from '@/services/paymentMethods.service';
import { creditCardsQuery } from '@/services/creditCards.service';
import type { PaymentMethodRow, CreditCardRow } from '@/db/schema';
import type { PaymentMethodId } from '@/types/ids';

/** Métodos de pago (incluidos los archivados) para la pantalla de gestión. */
export function useAllPaymentMethods(): PaymentMethodRow[] | undefined {
  return useLiveQuery(() => allPaymentMethodsQuery(), []);
}

/** Tarjetas activas, para vincularlas a un método de pago. */
export function useActiveCreditCards(): CreditCardRow[] {
  return useLiveQuery(() => creditCardsQuery(), [], [] as CreditCardRow[]) ?? [];
}

/**
 * Nº de movimientos que usan un método de pago. Sirve para avisar de que
 * cambiarle la tarjeta reasignará la deuda de todo ese historial.
 */
export function usePaymentMethodUsage(id: PaymentMethodId | undefined): number {
  return useLiveQuery(() => (id ? countPaymentMethodUsage(id) : Promise.resolve(0)), [id], 0) ?? 0;
}
