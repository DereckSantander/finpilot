import { loadLedger } from '@/services/ledger/load';
import type { Derivation, LedgerScope } from '@/services/ledger/types';

/**
 * Convierte una derivación pura en una `*Query` apta para `useLiveQuery`.
 *
 * Preserva la firma pública exacta de la consulta, de modo que migrar una
 * métrica al ledger no obliga a tocar ningún componente ni hook que la consuma.
 *
 * `scopes` acota las tablas leídas: pásalos siempre que la derivación no
 * necesite todo, o `useLiveQuery` revalidará la consulta ante escrituras que no
 * le afectan.
 */
export function fromLedger<Args extends unknown[], T>(
  derive: Derivation<Args, T>,
  scopes?: readonly LedgerScope[],
): (...args: Args) => Promise<T> {
  return async (...args: Args) => derive(await loadLedger(scopes), ...args);
}
