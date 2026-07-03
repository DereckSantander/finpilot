import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { parseOrThrow } from '@/lib/validation/parse';
import { tagCreateSchema, type TagCreateInput } from '@/lib/validation/catalog.schema';
import { NotFoundError } from '@/lib/errors';
import type { TagRow } from '@/db/schema';
import type { TagId } from '@/types/ids';

/**
 * Etiquetas. En los movimientos se guardan por nombre (string[]); esta tabla
 * mantiene el catálogo único para autocompletado.
 */

export function tagsQuery(): Promise<TagRow[]> {
  return db.tags.orderBy('name').toArray();
}

export async function createTag(input: TagCreateInput): Promise<TagRow> {
  const data = parseOrThrow(tagCreateSchema, input);
  const existing = await db.tags.where('name').equalsIgnoreCase(data.name).first();
  if (existing) return existing;

  const row: TagRow = {
    id: newId<TagId>(),
    name: data.name,
    createdAt: nowIso(),
  };
  await db.tags.add(row);
  return row;
}

/**
 * Garantiza que existan las etiquetas indicadas (por nombre). Se usa al guardar
 * un movimiento con etiquetas. Ignora nombres vacíos y duplicados.
 */
export async function ensureTagsExist(names: readonly string[]): Promise<void> {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter((n) => n.length > 0)));
  if (unique.length === 0) return;

  await db.transaction('rw', db.tags, async () => {
    for (const name of unique) {
      const existing = await db.tags.where('name').equalsIgnoreCase(name).first();
      if (!existing) {
        await db.tags.add({ id: newId<TagId>(), name, createdAt: nowIso() });
      }
    }
  });
}

export async function deleteTag(id: TagId): Promise<void> {
  const tag = await db.tags.get(id);
  if (!tag) throw new NotFoundError('Etiqueta', id);
  await db.tags.delete(id);
}
