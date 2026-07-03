import { useLiveQuery } from 'dexie-react-hooks';
import {
  cardsSummaryQuery,
  cardDetailQuery,
  cardHistoryQuery,
  cardMovementsQuery,
  type CardSummary,
  type CardDetail,
  type CardHistoryMonth,
  type CardMovement,
} from '@/services/metrics.service';
import type { CreditCardId } from '@/types/ids';

/** Resumen reactivo de todas las tarjetas activas. */
export function useCreditCards(): CardSummary[] | undefined {
  return useLiveQuery(() => cardsSummaryQuery(), []);
}

/** Detalle reactivo de una tarjeta (deuda, utilización, próximos pago/corte). */
export function useCardDetail(cardId: CreditCardId): CardDetail | undefined {
  return useLiveQuery(() => cardDetailQuery(cardId), [cardId]);
}

/** Historial mensual reactivo de una tarjeta. */
export function useCardHistory(cardId: CreditCardId, months = 6): CardHistoryMonth[] | undefined {
  return useLiveQuery(() => cardHistoryQuery(cardId, months), [cardId, months]);
}

/** Movimientos reactivos (consumos + pagos) de una tarjeta. */
export function useCardMovements(cardId: CreditCardId): CardMovement[] | undefined {
  return useLiveQuery(() => cardMovementsQuery(cardId), [cardId]);
}
