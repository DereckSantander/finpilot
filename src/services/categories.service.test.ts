import { describe, it, expect, beforeEach } from 'vitest';
import { createCategory, deleteCategory, countCategoryUsage } from '@/services/categories.service';
import { createTransaction, transactionsQuery } from '@/services/transactions.service';
import { db } from '@/db/db';
import { resetDb, EXPENSE_CAT } from '@/test/seed';
import { ConflictError } from '@/lib/errors';
import type { CategoryId } from '@/types/ids';

describe('categories.service · integridad referencial', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('reasigna los movimientos al eliminar una categoría en uso', async () => {
    const source = await createCategory({
      name: 'Suscripciones',
      type: 'expense',
      color: '#6366f1',
      icon: 'Tag',
    });
    const target = await createCategory({
      name: 'Otros',
      type: 'expense',
      color: '#94a3b8',
      icon: 'Tag',
    });

    const tx = await createTransaction({
      type: 'expense',
      amount: 1_500,
      date: '2026-07-05',
      categoryId: source.id as CategoryId,
      description: 'Streaming',
      tags: [],
    });

    expect(await countCategoryUsage(source.id as CategoryId)).toBe(1);

    await deleteCategory(source.id as CategoryId, { reassignToId: target.id as CategoryId });

    // La categoría desapareció y el movimiento apunta ahora a la de reemplazo.
    expect(await db.categories.get(source.id)).toBeUndefined();
    const moved = await db.transactions.get(tx.id);
    expect(moved?.categoryId).toBe(target.id);
  });

  it('bloquea el borrado de una categoría en uso sin reemplazo', async () => {
    const cat = await createCategory({
      name: 'Temporal',
      type: 'expense',
      color: '#e11d48',
      icon: 'Tag',
    });
    await createTransaction({
      type: 'expense',
      amount: 500,
      date: '2026-07-05',
      categoryId: cat.id as CategoryId,
      description: 'Gasto',
      tags: [],
    });

    await expect(deleteCategory(cat.id as CategoryId)).rejects.toBeInstanceOf(ConflictError);
    // Sigue existiendo tras el intento fallido.
    expect(await db.categories.get(cat.id)).toBeDefined();
  });

  it('no permite eliminar categorías del sistema', async () => {
    // EXPENSE_CAT se siembra como isSystem: true.
    await expect(deleteCategory(EXPENSE_CAT)).rejects.toBeInstanceOf(ConflictError);
  });

  it('elimina sin reasignar una categoría sin movimientos', async () => {
    const cat = await createCategory({
      name: 'Vacía',
      type: 'income',
      color: '#16a34a',
      icon: 'Tag',
    });
    await deleteCategory(cat.id as CategoryId);
    expect(await db.categories.get(cat.id)).toBeUndefined();
    // No afecta a los movimientos existentes.
    expect(await transactionsQuery()).toHaveLength(0);
  });
});
