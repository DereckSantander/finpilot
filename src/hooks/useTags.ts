import { useLiveQuery } from 'dexie-react-hooks';
import { tagsQuery } from '@/services/tags.service';
import type { TagRow } from '@/db/schema';

/** Catálogo de etiquetas para autocompletado (reactivo). */
export function useTags(): TagRow[] {
  return useLiveQuery(tagsQuery, [], [] as TagRow[]) ?? [];
}
