import { useLiveQuery } from 'dexie-react-hooks';
import { allPaymentMethodsQuery } from '@/services/paymentMethods.service';
import { creditCardsQuery } from '@/services/creditCards.service';
import type { PaymentMethodRow, CreditCardRow } from '@/db/schema';

/** Métodos de pago (incluidos los archivados) para la pantalla de gestión. */
export function useAllPaymentMethods(): PaymentMethodRow[] | undefined {
  return useLiveQuery(() => allPaymentMethodsQuery(), []);
}

/** Tarjetas activas, para vincularlas a un método de pago. */
export function useActiveCreditCards(): CreditCardRow[] {
  return useLiveQuery(() => creditCardsQuery(), [], [] as CreditCardRow[]) ?? [];
}
