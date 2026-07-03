import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { stripUndefined } from '@/lib/object';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from '@/lib/validation/catalog.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { CategoryRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { CategoryId } from '@/types/ids';

/**
 * CRUD de categorías con integridad referencial (features.md: al borrar una
 * categoría en uso se bloquea o se reasignan sus movimientos). Las categorías
 * `isSystem` no se pueden eliminar, solo archivar.
 */

/** Query reactiva: categorías activas ordenadas (para `useLiveQuery`). */
export function categoriesQuery(): Promise<CategoryRow[]> {
  return db.categories
    .orderBy('sortOrder')
    .filter((c) => !c.isArchived)
    .toArray();
}

/** Query reactiva de categorías de un tipo concreto. */
export function categoriesByTypeQuery(type: TransactionType): Promise<CategoryRow[]> {
  return db.categories
    .orderBy('sortOrder')
    .filter((c) => c.type === type && !c.isArchived)
    .toArray();
}

/** Todas las categorías, incluidas las archivadas. */
export function allCategoriesQuery(): Promise<CategoryRow[]> {
  return db.categories.orderBy('sortOrder').toArray();
}

export async function getCategory(id: CategoryId): Promise<CategoryRow> {
  const row = await db.categories.get(id);
  if (!row) throw new NotFoundError('Categoría', id);
  return row;
}

export async function createCategory(input: CategoryCreateInput): Promise<CategoryRow> {
  const data = parseOrThrow(categoryCreateSchema, input);
  const timestamp = nowIso();
  const maxOrder = await db.categories.orderBy('sortOrder').last();

  const row: CategoryRow = {
    id: newId<CategoryId>(),
    name: data.name,
    type: data.type,
    color: data.color,
    icon: data.icon,
    isSystem: false,
    isArchived: false,
    sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.categories.add(row);
  return row;
}

export async function updateCategory(id: CategoryId, input: CategoryUpdateInput): Promise<void> {
  const data = parseOrThrow(categoryUpdateSchema, input);
  await getCategory(id); // garantiza existencia
  const patch = stripUndefined({ ...data, updatedAt: nowIso() });
  await db.categories.update(id, patch);
}

export async function archiveCategory(id: CategoryId, archived = true): Promise<void> {
  await getCategory(id);
  await db.categories.update(id, { isArchived: archived, updatedAt: nowIso() });
}

/** Nº de movimientos que usan la categoría. */
export function countCategoryUsage(id: CategoryId): Promise<number> {
  return db.transactions.where('categoryId').equals(id).count();
}

/**
 * Elimina una categoría. Si tiene movimientos asociados, exige `reassignToId`
 * (categoría del mismo tipo) para reasignarlos; de lo contrario lanza conflicto.
 * Las categorías del sistema no se pueden eliminar.
 */
export async function deleteCategory(
  id: CategoryId,
  options: { reassignToId?: CategoryId } = {},
): Promise<void> {
  const category = await getCategory(id);
  if (category.isSystem) {
    throw new ConflictError('Las categorías del sistema no se pueden eliminar, solo archivar.');
  }

  await db.transaction('rw', db.transactions, db.budgets, db.categories, async () => {
    const usage = await db.transactions.where('categoryId').equals(id).count();

    if (usage > 0) {
      if (!options.reassignToId) {
        throw new ConflictError(
          `La categoría tiene ${usage} movimiento(s). Indica una categoría de reemplazo para eliminarla.`,
        );
      }
      const target = await db.categories.get(options.reassignToId);
      if (!target) throw new NotFoundError('Categoría de reemplazo', options.reassignToId);
      if (target.type !== category.type) {
        throw new ConflictError('La categoría de reemplazo debe ser del mismo tipo.');
      }
      await db.transactions
        .where('categoryId')
        .equals(id)
        .modify({ categoryId: options.reassignToId, updatedAt: nowIso() });
    }

    // Los presupuestos por categoría se reasignan o se eliminan.
    if (options.reassignToId) {
      await db.budgets
        .where('categoryId')
        .equals(id)
        .modify({ categoryId: options.reassignToId, updatedAt: nowIso() });
    } else {
      await db.budgets.where('categoryId').equals(id).delete();
    }

    await db.categories.delete(id);
  });
}
