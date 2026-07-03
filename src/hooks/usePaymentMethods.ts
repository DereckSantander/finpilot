import { useLiveQuery } from 'dexie-react-hooks';
import { paymentMethodsQuery } from '@/services/paymentMethods.service';
import type { PaymentMethodRow } from '@/db/schema';

/** Métodos de pago activos (reactivo). */
export function usePaymentMethods(): PaymentMethodRow[] {
  return useLiveQuery(paymentMethodsQuery, [], [] as PaymentMethodRow[]) ?? [];
}
