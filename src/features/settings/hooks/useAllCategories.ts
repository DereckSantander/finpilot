import { useLiveQuery } from 'dexie-react-hooks';
import { allCategoriesQuery } from '@/services/categories.service';
import type { CategoryRow } from '@/db/schema';

/** Todas las categorías (activas y archivadas), reactivo. */
export function useAllCategories(): CategoryRow[] | undefined {
  return useLiveQuery(() => allCategoriesQuery(), []);
}
