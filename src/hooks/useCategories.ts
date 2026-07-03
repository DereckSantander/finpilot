import { useLiveQuery } from 'dexie-react-hooks';
import { categoriesQuery, categoriesByTypeQuery } from '@/services/categories.service';
import type { CategoryRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';

/**
 * Categorías activas, opcionalmente filtradas por tipo. Reactivo: se actualiza
 * al cambiar la tabla `categories`.
 */
export function useCategories(type?: TransactionType): CategoryRow[] {
  return (
    useLiveQuery(
      () => (type ? categoriesByTypeQuery(type) : categoriesQuery()),
      [type],
      [] as CategoryRow[],
    ) ?? []
  );
}
